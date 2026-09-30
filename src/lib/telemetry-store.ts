import { prisma } from "@/lib/prisma";
import type { TelemetryInput } from "@/lib/telemetry";
import { MONITORING_ACTIONS, recordMonitoringEvent } from "@/lib/monitoring";

type Settings = Awaited<ReturnType<typeof loadSettings>>;
type Sample = {
  timestamp: Date;
  pvPowerW: number;
  loadPowerW: number;
  batteryPowerW: number;
  batterySoc: number;
  gridPowerW: number | null;
  gridConnected: boolean;
};

export function loadSettings() {
  return prisma.energySettings.findUnique({ where: { id: "default" } });
}

// بداية اليوم حسب المنطقة الزمنية للمستخدم (وليس UTC) حتى لا ينقسم اليوم عند 02:00/03:00 محلياً
export function localDayStart(date: Date, timeZone?: string | null) {
  try {
    const text = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    const [y, m, d] = text.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  } catch {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}

async function updateDailySummary(
  timestamp: Date,
  previous: Sample | null,
  current: Sample,
  settings: Settings,
) {
  if (!previous) return;

  // Integrate only between close readings. After an outage (app closed, dongle
  // offline) the old reading says nothing about the gap, so it is not counted
  // rather than averaged over an invented 20 minutes.
  const hours = Math.max((timestamp.getTime() - previous.timestamp.getTime()) / 3_600_000, 0);
  if (hours <= 0 || hours > 0.25) return;

  const avg = (a: number, b: number) => ((a + b) / 2 / 1000) * hours;
  const solarKWh = avg(previous.pvPowerW, current.pvPowerW);
  const homeKWh = avg(previous.loadPowerW, current.loadPowerW);
  const batteryDelta = avg(previous.batteryPowerW, current.batteryPowerW);
  const gridAvg = avg(previous.gridPowerW ?? 0, current.gridPowerW ?? 0);
  const gridImportKWh = Math.max(0, gridAvg);
  const gridExportKWh = Math.max(0, -gridAvg);
  const batteryChargeKWh = Math.max(0, batteryDelta);
  const batteryDischargeKWh = Math.max(0, -batteryDelta);

  const tariff = settings?.gridTariff ?? 0;
  const exportTariff = settings?.exportTariff ?? 0;
  const avoidedGridKWh = Math.min(homeKWh, solarKWh + batteryDischargeKWh);
  const savings = avoidedGridKWh * tariff + gridExportKWh * exportTariff;
  const day = localDayStart(timestamp, settings?.timezone);

  await prisma.dailySummary.upsert({
    where: { day },
    create: {
      day,
      solarKWh,
      homeKWh,
      batteryChargeKWh,
      batteryDischargeKWh,
      gridImportKWh,
      gridExportKWh,
      savings,
      currency: settings?.currency ?? "USD",
    },
    update: {
      solarKWh: { increment: solarKWh },
      homeKWh: { increment: homeKWh },
      batteryChargeKWh: { increment: batteryChargeKWh },
      batteryDischargeKWh: { increment: batteryDischargeKWh },
      gridImportKWh: { increment: gridImportKWh },
      gridExportKWh: { increment: gridExportKWh },
      savings: { increment: savings },
    },
  });
}

// تنبيه عند "عبور" الحد فقط، بدل تسجيل حدث جديد مع كل قراءة (كل 5-60 ثانية)
function collectAlerts(previous: Sample | null, row: Sample, s: NonNullable<Settings>) {
  const events: Array<{ action: string; details: string }> = [];

  const wasCritical = previous ? previous.batterySoc <= s.criticalBatteryPct : false;
  const wasLow = previous ? previous.batterySoc <= s.lowBatteryPct : false;
  if (row.batterySoc <= s.criticalBatteryPct) {
    if (!wasCritical) events.push({ action: "ALERT_CRITICAL_BATTERY", details: `batterySoc=${row.batterySoc}` });
  } else if (row.batterySoc <= s.lowBatteryPct) {
    if (!wasLow) events.push({ action: "ALERT_LOW_BATTERY", details: `batterySoc=${row.batterySoc}` });
  }

  if (s.inverterRatedPowerKw) {
    const limit = s.inverterRatedPowerKw * 1000 * (s.overloadPct / 100);
    const wasOver = previous ? previous.loadPowerW >= limit : false;
    if (row.loadPowerW >= limit && !wasOver) {
      events.push({ action: "ALERT_OVERLOAD", details: `loadPowerW=${row.loadPowerW}` });
    }
  }

  if (previous && s.gridOutageAlert && previous.gridConnected !== row.gridConnected) {
    events.push({
      action: row.gridConnected ? "ALERT_GRID_RESTORED" : "ALERT_GRID_OUTAGE",
      details: `gridConnected=${row.gridConnected}`,
    });
  }
  return events;
}


/**
 * Stores one reading and runs the follow-up work (daily totals, alerts,
 * retention, connection status). Shared by the gateway ingest route and the
 * SmartESS cloud reader so both feed the dashboard identically.
 *
 * Throws only if the reading itself could not be written. Failures after that
 * are logged and swallowed: the reading is already stored, and reporting an
 * error would make a gateway resend it and create duplicates.
 */
export async function ingestSample(input: TelemetryInput) {
  const timestamp = new Date(input.timestamp ?? new Date().toISOString());

  const latest: Sample | null = await prisma.telemetryLog.findFirst({ orderBy: { timestamp: "desc" } });
  const row: Sample = await prisma.telemetryLog.create({
    data: {
      timestamp,
      pvPowerW: input.pv_power,
      loadPowerW: input.load_power,
      batterySoc: input.battery_soc,
      batteryPowerW: input.battery_power,
      batteryVoltage: input.battery_voltage,
      batteryCurrent: input.battery_current,
      batteryTemperature: input.battery_temperature,
      gridConnected: input.grid_status,
      gridPowerW: input.grid_power,
      source: input.source,
    },
  });

  try {
    const settings = await loadSettings();
    await updateDailySummary(timestamp, latest, row, settings);

    if (settings) {
      for (const event of collectAlerts(latest, row, settings)) {
        await recordMonitoringEvent({ action: event.action, success: true, details: event.details });
      }
      // Retention runs about once an hour rather than on every reading.
      const hourChanged = !latest || latest.timestamp.getUTCHours() !== timestamp.getUTCHours();
      if (settings.retentionDays > 0 && hourChanged) {
        const cutoff = new Date(Date.now() - settings.retentionDays * 86_400_000);
        await prisma.telemetryLog.deleteMany({ where: { timestamp: { lt: cutoff } } });
      }
    }

    if (input.source.toLowerCase() !== "demo") {
      await prisma.inverterConnection.updateMany({
        where: { id: "default" },
        data: { lastStatus: "connected", lastSeenAt: timestamp },
      });
      await recordMonitoringEvent({
        action: MONITORING_ACTIONS.TELEMETRY_RECEIVED,
        success: true,
        details: `source=${input.source}; timestamp=${timestamp.toISOString()}`,
      });
    }
  } catch (error) {
    console.error("[telemetry] post_processing_failed", error);
  }

  return row;
}
