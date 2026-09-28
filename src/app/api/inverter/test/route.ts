import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mockResult() {
  return {
    ok: true,
    source: "mock",
    message: "وضع الاختبار التجريبي يعمل. لم يتم الوصول إلى منفذ RS485 فعلي.",
    latencyMs: 12,
    telemetry: { solarPowerW: 4200, batterySoc: 78, batteryPowerW: -850, loadPowerW: 3350, gridPowerW: 0, gridConnected: false, faultCode: 0 },
  };
}

function configured() {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL);
}

export async function POST(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (process.env.SHAMSAK_MOCK_INVERTER === "true") return NextResponse.json(mockResult());
  if (!configured()) return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503 });

  try {
    const row = await prisma.inverterConnection.findUnique({ where: { id: "default" } });
    if (!row) return NextResponse.json({ ok: false, error: "inverter_not_configured" }, { status: 422 });

    const gatewayUrl = (row.gatewayUrl || process.env.SHAMSAK_GATEWAY_URL || "").replace(/\/$/, "");
    if (!gatewayUrl) {
      return NextResponse.json({ ok: false, error: "gateway_not_configured", message: "لم يتم ضبط عنوان Local Gateway. Vercel لا يستطيع فتح COM3 أو /dev/ttyUSB0 مباشرة." }, { status: 422 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), row.timeoutMs + 1500);
    const started = Date.now();
    try {
      const response = await fetch(`${gatewayUrl}/v1/inverter/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(process.env.SHAMSAK_GATEWAY_TOKEN ? { Authorization: `Bearer ${process.env.SHAMSAK_GATEWAY_TOKEN}` } : {}) },
        body: JSON.stringify({
          enabled: row.enabled,
          protocol: row.protocol === "Modbus TCP" ? "modbus-tcp" : row.protocol === "Wi-Fi Datalogger" ? "wifi-gateway" : "modbus-rtu",
          manufacturer: row.manufacturer || "Felicity",
          model: row.inverterModel || "Felicity",
          address: row.inverterAddress || "",
          port: row.port,
          serialPort: row.serialPort || "",
          baudRate: row.baudRate,
          dataBits: row.dataBits,
          stopBits: row.stopBits,
          parity: row.parity,
          slaveId: row.slaveId,
          timeoutMs: row.timeoutMs,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({ message: "gateway_invalid_response" }));
      if (!response.ok || data.ok !== true) {
        await prisma.inverterConnection.update({ where: { id: "default" }, data: { lastStatus: "error" } });
        return NextResponse.json({ ok: false, source: "gateway", latencyMs: Date.now() - started, ...data }, { status: 502 });
      }
      await prisma.inverterConnection.update({ where: { id: "default" }, data: { lastStatus: "connected", lastSeenAt: new Date() } });
      return NextResponse.json({ ...data, source: "gateway", latencyMs: Date.now() - started });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "انتهت مهلة الاتصال بالبوابة." : error instanceof Error ? error.message : "gateway_connection_failed";
    return NextResponse.json({ ok: false, source: "gateway", error: "gateway_connection_failed", message }, { status: 502 });
  }
}
