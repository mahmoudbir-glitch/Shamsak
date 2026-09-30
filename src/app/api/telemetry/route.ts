import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { telemetryInputSchema, telemetryToSnapshot } from "@/lib/telemetry";
import { MONITORING_ACTIONS, recordMonitoringEvent } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// أي قراءة أقدم من هذه المدة تعتبر "قديمة" ولا تُعرض كبيانات حية
const STALE_AFTER_SEC = 180;

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

function loadSettings() {
  return prisma.energySettings.findUnique({ where: { id: "default" } });
}

function unauthorized() {
  return NextResponse.json({ error: "telemetry_unauthorized" }, { status: 401 });
}

// نفس القائمة المستخدمة في route الإعدادات، حتى لا يختلف السلوك بين المسارين
function configured() {
  return Boolean(
    process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL,
  );
}

// مقارنة ثابتة الزمن لمنع تسريب التوكن عبر توقيت الاستجابة
function validToken(request: NextRequest) {
  const expected = process.env.TELEMETRY_INGEST_TOKEN;
  if (!expected) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${expected}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

// بداية اليوم حسب المنطقة الزمنية للمستخدم (وليس UTC) حتى لا ينقسم اليوم عند 02:00/03:00 محلياً
function localDayStart(date: Date, timeZone?: string | null) {
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

  const hours = Math.min(
    Math.max((timestamp.getTime() - previous.timestamp.getTime()) / 3_600_000, 0),
    1 / 3,
  );
  if (hours <= 0) return;

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

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (process.env.SHAMSAK_MOCK_INVERTER === "true") {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        solarPowerW: 4200,
        homePowerW: 3350,
        gridPowerW: 0,
        batteryPowerW: 850,
        batterySoc: 78,
        batteryVoltage: 51.2,
        batteryCurrent: 16.6,
        batteryTemperature: 28,
        gridConnected: false,
        source: "mock",
        stale: false,
        ageSeconds: 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!configured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  try {
    const row = await prisma.telemetryLog.findFirst({ orderBy: { timestamp: "desc" } });
    if (!row) return NextResponse.json({ error: "no_telemetry" }, { status: 404 });

    const ageSeconds = Math.max(0, Math.round((Date.now() - row.timestamp.getTime()) / 1000));

    return NextResponse.json(
      {
        timestamp: row.timestamp.toISOString(),
        solarPowerW: row.pvPowerW,
        homePowerW: row.loadPowerW,
        gridPowerW: row.gridPowerW ?? 0,
        batteryPowerW: row.batteryPowerW,
        batterySoc: row.batterySoc,
        batteryVoltage: row.batteryVoltage ?? undefined,
        batteryCurrent: row.batteryCurrent ?? undefined,
        batteryTemperature: row.batteryTemperature ?? undefined,
        gridConnected: row.gridConnected,
        source: "live",
        // الواجهة تستطيع الآن إظهار "غير متصل" بدل عرض قراءة قديمة كأنها لحظية
        stale: ageSeconds > STALE_AFTER_SEC,
        ageSeconds,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[telemetry] read_failed", error);
    return NextResponse.json({ error: "telemetry_read_failed" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!configured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  // رسالة واضحة بدل 401 مبهم عندما يكون المتغير غير مضبوط في Vercel
  if (!process.env.TELEMETRY_INGEST_TOKEN) {
    console.error("[telemetry] TELEMETRY_INGEST_TOKEN is not set");
    return NextResponse.json({ error: "telemetry_token_not_configured" }, { status: 503 });
  }
  if (!validToken(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = telemetryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_telemetry", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const timestamp = new Date(input.timestamp ?? new Date().toISOString());

  let latest: Sample | null = null;
  let row: Sample;
  try {
    latest = await prisma.telemetryLog.findFirst({ orderBy: { timestamp: "desc" } });
    row = await prisma.telemetryLog.create({
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
  } catch (error) {
    console.error("[telemetry] write_failed", error);
    return NextResponse.json({ error: "telemetry_write_failed" }, { status: 503 });
  }

  // بعد حفظ القراءة: أي فشل هنا لا يجب أن يجعل الـ gateway يعيد الإرسال (يسبب تكراراً)
  try {
    const settings = await loadSettings();
    await updateDailySummary(timestamp, latest, row, settings);

    if (settings) {
      for (const event of collectAlerts(latest, row, settings)) {
        await recordMonitoringEvent({ action: event.action, success: true, details: event.details });
      }
      // التنظيف مرة كل ساعة تقريباً بدل كل قراءة
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

  return NextResponse.json(
    { accepted: true, stored: true, snapshot: telemetryToSnapshot(input) },
    { status: 201 },
  );
}
