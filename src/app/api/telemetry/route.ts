import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { telemetryInputSchema, telemetryToSnapshot } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORE_INTERVAL_MS = 5 * 60 * 1000;

function unauthorized() {
  return NextResponse.json({ error: "telemetry_unauthorized" }, { status: 401 });
}

function configured() {
  return Boolean(
    process.env.DATABASE_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL
  );
}

function validToken(request: NextRequest) {
  const expected = process.env.TELEMETRY_INGEST_TOKEN;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}` ||
    request.headers.get("x-telemetry-token") === expected;
}

function dayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function updateDailySummary(
  timestamp: Date,
  previous: {
    timestamp: Date;
    pvPowerW: number;
    loadPowerW: number;
    batteryPowerW: number;
    gridPowerW: number | null;
  } | null,
  current: {
    pvPowerW: number;
    loadPowerW: number;
    batteryPowerW: number;
    gridPowerW: number | null;
  },
) {
  if (!previous) return;

  const hours = Math.min(
    Math.max((timestamp.getTime() - previous.timestamp.getTime()) / 3_600_000, 0),
    1 / 3,
  );
  if (hours <= 0) return;

  const avg = (a: number, b: number) => ((a + b) / 2) / 1000 * hours;
  const solarKWh = avg(previous.pvPowerW, current.pvPowerW);
  const homeKWh = avg(previous.loadPowerW, current.loadPowerW);
  const batteryDelta = avg(previous.batteryPowerW, current.batteryPowerW);
  const previousGrid = previous.gridPowerW ?? 0;
  const currentGrid = current.gridPowerW ?? 0;
  const gridImportKWh = Math.max(0, avg(previousGrid, currentGrid));
  const gridExportKWh = Math.max(0, -avg(previousGrid, currentGrid));
  const batteryChargeKWh = Math.max(0, batteryDelta);
  const batteryDischargeKWh = Math.max(0, -batteryDelta);

  const settings = await prisma.energySettings.findUnique({ where: { id: "default" } });
  const tariff = settings?.gridTariff ?? 0;
  const exportTariff = settings?.exportTariff ?? 0;
  const avoidedGridKWh = Math.min(homeKWh, solarKWh + batteryDischargeKWh);
  const savings = avoidedGridKWh * tariff + gridExportKWh * exportTariff;

  await prisma.dailySummary.upsert({
    where: { day: dayStart(timestamp) },
    create: {
      day: dayStart(timestamp),
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

export async function GET() {
  if (!configured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  try {
    const row = await prisma.telemetryLog.findFirst({ orderBy: { timestamp: "desc" } });
    if (!row) return NextResponse.json({ error: "no_telemetry" }, { status: 404 });

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
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "telemetry_read_failed" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!configured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
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

  try {
    const latest = await prisma.telemetryLog.findFirst({ orderBy: { timestamp: "desc" } });
    if (latest && timestamp.getTime() - latest.timestamp.getTime() < STORE_INTERVAL_MS) {
      return NextResponse.json({
        accepted: true,
        stored: false,
        reason: "five_minute_sampling_window",
        snapshot: telemetryToSnapshot(input),
      });
    }

    const row = await prisma.telemetryLog.create({
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

    await updateDailySummary(timestamp, latest, row);

    return NextResponse.json(
      { accepted: true, stored: true, snapshot: telemetryToSnapshot(input) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "telemetry_write_failed" }, { status: 503 });
  }
}
