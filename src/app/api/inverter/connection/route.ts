import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/inverter-config-crypto";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { MONITORING_ACTIONS, recordMonitoringEvent } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const configured = () => Boolean(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL);
const text = (value: unknown, max = 255) => typeof value === "string" ? value.trim().slice(0, max) : "";
const integer = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const row = await prisma.inverterConnection.findUnique({ where: { id: "default" } });
    if (!row) return NextResponse.json({ configured: false, connection: null });
    return NextResponse.json({
      configured: true,
      connection: {
        id: row.id, systemName: row.systemName, inverterModel: row.inverterModel, manufacturer: row.manufacturer,
        protocol: row.protocol, inverterAddress: row.inverterAddress, serialPort: row.serialPort, port: row.port,
        baudRate: row.baudRate, dataBits: row.dataBits, stopBits: row.stopBits, parity: row.parity,
        slaveId: row.slaveId, timeoutMs: row.timeoutMs, pollingIntervalMs: row.pollingIntervalMs,
        gatewayUrl: row.gatewayUrl, wifiSsid: row.wifiSsid, hasWifiPassword: Boolean(row.wifiPasswordCipher),
        enabled: row.enabled, lastStatus: row.lastStatus, lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "inverter_config_read_failed" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const systemName = text(body.systemName, 120);
  if (!systemName) return NextResponse.json({ error: "missing_connection_fields" }, { status: 400 });

  const protocol = text(body.protocol, 50) || "Modbus RTU";
  const wifiPassword = typeof body.wifiPassword === "string" ? body.wifiPassword : "";
  const panelCapacityKw = Number(body.panelCapacityKw);
  const batteryCapacityWh = Number(body.batteryCapacityWh);

  if (body.panelCapacityKw !== undefined && (!Number.isFinite(panelCapacityKw) || panelCapacityKw <= 0)) return NextResponse.json({ error: "invalid_panel_capacity" }, { status: 422 });
  if (body.batteryCapacityWh !== undefined && (!Number.isFinite(batteryCapacityWh) || batteryCapacityWh <= 0)) return NextResponse.json({ error: "invalid_battery_capacity" }, { status: 422 });

  try {
    const existing = await prisma.inverterConnection.findUnique({ where: { id: "default" } });
    const row = await prisma.inverterConnection.upsert({
      where: { id: "default" },
      create: {
        id: "default", systemName, inverterModel: text(body.inverterModel, 120) || "Felicity",
        manufacturer: text(body.manufacturer, 80) || "Felicity", protocol,
        inverterAddress: text(body.inverterAddress), serialPort: text(body.serialPort),
        port: integer(body.port, 502, 1, 65535), baudRate: integer(body.baudRate, 9600, 300, 921600),
        dataBits: integer(body.dataBits, 8, 5, 8), stopBits: integer(body.stopBits, 1, 1, 2),
        parity: ["N", "E", "O"].includes(String(body.parity)) ? String(body.parity) : "N",
        slaveId: integer(body.slaveId, 1, 1, 247), timeoutMs: integer(body.timeoutMs, 3000, 500, 15000),
        pollingIntervalMs: integer(body.pollingIntervalMs, 10000, 2000, 300000),
        gatewayUrl: text(body.gatewayUrl, 500) || null, wifiSsid: text(body.wifiSsid, 120) || null,
        wifiPasswordCipher: wifiPassword ? encryptSecret(wifiPassword) : null,
      },
      update: {
        systemName, inverterModel: text(body.inverterModel, 120) || "Felicity",
        manufacturer: text(body.manufacturer, 80) || "Felicity", protocol,
        inverterAddress: text(body.inverterAddress) || null, serialPort: text(body.serialPort) || null,
        port: integer(body.port, 502, 1, 65535), baudRate: integer(body.baudRate, 9600, 300, 921600),
        dataBits: integer(body.dataBits, 8, 5, 8), stopBits: integer(body.stopBits, 1, 1, 2),
        parity: ["N", "E", "O"].includes(String(body.parity)) ? String(body.parity) : "N",
        slaveId: integer(body.slaveId, 1, 1, 247), timeoutMs: integer(body.timeoutMs, 3000, 500, 15000),
        pollingIntervalMs: integer(body.pollingIntervalMs, 10000, 2000, 300000),
        gatewayUrl: text(body.gatewayUrl, 500) || null, wifiSsid: text(body.wifiSsid, 120) || null,
        ...(wifiPassword ? { wifiPasswordCipher: encryptSecret(wifiPassword) } : {}),
      },
    });

    if (body.panelCapacityKw !== undefined || body.batteryCapacityWh !== undefined) {
      await prisma.energySettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          panelPowerW: body.panelCapacityKw !== undefined ? panelCapacityKw * 1000 : 6000,
          batteryCapacityWh: body.batteryCapacityWh !== undefined ? batteryCapacityWh : 10000,
        },
        update: {
          ...(body.panelCapacityKw !== undefined ? { panelPowerW: panelCapacityKw * 1000 } : {}),
          ...(body.batteryCapacityWh !== undefined ? { batteryCapacityWh } : {}),
        },
      });
    }

    await recordMonitoringEvent({
      action: MONITORING_ACTIONS.INVERTER_CONFIG_SAVED,
      username: session.username,
      details: `system=${row.systemName}; protocol=${row.protocol}; slave=${row.slaveId}`,
    });

    return NextResponse.json({ saved: true, hasWifiPassword: Boolean(row.wifiPasswordCipher), preservedPassword: Boolean(existing?.wifiPasswordCipher && !wifiPassword) });
  } catch (error) {
    console.error("inverter_config_write_failed", error);
    return NextResponse.json({ error: "inverter_config_write_failed" }, { status: 503 });
  }
}
