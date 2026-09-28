import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "127.0.0.1" || normalized === "::1" || normalized.startsWith("10.") || normalized.startsWith("192.168.") || normalized.startsWith("169.254.") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return true;
  const match = normalized.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

async function publicGateway(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid_gateway_protocol");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || isPrivateIp(host)) throw new Error("private_gateway");
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("private_gateway");
  return url.toString().replace(/\/$/, "");
}

function configured() {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL);
}

export async function POST(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized", message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  if (process.env.SHAMSAK_MOCK_INVERTER === "true") {
    return NextResponse.json({ ok: true, source: "mock", message: "وضع الاختبار التجريبي يعمل بنجاح — لا يوجد اتصال عتادي فعلي.", latencyMs: 12 });
  }
  if (!configured()) return NextResponse.json({ ok: false, error: "database_not_configured", message: "قاعدة البيانات غير مهيأة." }, { status: 503 });

  try {
    const row = await prisma.inverterConnection.findFirst({ where: { isPrimary: true } }) ?? await prisma.inverterConnection.findUnique({ where: { id: "default" } });
    if (!row) return NextResponse.json({ ok: false, error: "inverter_not_configured", message: "لم تتم إضافة إنفرتر بعد." }, { status: 422 });

    if (row.connectionMode === "local" || row.protocol === "Modbus RTU" && !row.gatewayUrl) {
      return NextResponse.json({ ok: false, error: "serial_port_unavailable", message: "المنفذ التسلسلي غير متاح من السحابة. استخدم بوابة محلية على الجهاز المتصل بالإنفرتر." }, { status: 422 });
    }

    const gatewayUrl = row.gatewayUrl || process.env.SHAMSAK_GATEWAY_URL || "";
    if (!gatewayUrl) return NextResponse.json({ ok: false, error: "gateway_not_configured", message: "لم يتم ضبط عنوان بوابة البيانات." }, { status: 422 });

    let safeGateway: string;
    try { safeGateway = await publicGateway(gatewayUrl); }
    catch (error) {
      const reason = error instanceof Error ? error.message : "";
      const message = reason === "private_gateway"
        ? "بوابة البيانات تستخدم عنواناً محلياً لا يمكن الوصول إليه من Vercel. انشر البوابة عبر HTTPS أو استخدم نفقاً آمناً."
        : "عنوان بوابة البيانات غير صالح.";
      await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastTestResult: "error", lastTestReason: message } });
      return NextResponse.json({ ok: false, error: "invalid_gateway", message }, { status: 422 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), row.timeoutMs);
    const started = Date.now();
    try {
      const response = await fetch(safeGateway + "/v1/inverter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(process.env.SHAMSAK_GATEWAY_TOKEN ? { Authorization: "Bearer " + process.env.SHAMSAK_GATEWAY_TOKEN } : {}) },
        body: JSON.stringify({
          enabled: row.enabled,
          protocol: row.protocol === "Modbus TCP" ? "modbus-tcp" : row.protocol === "Wi-Fi Datalogger" ? "wifi-gateway" : "modbus-rtu",
          manufacturer: row.manufacturer || "Felicity", model: row.inverterModel || "Felicity",
          address: row.inverterAddress || "", port: row.port, serialPort: row.serialPort || "",
          baudRate: row.baudRate, dataBits: row.dataBits, stopBits: row.stopBits, parity: row.parity,
          slaveId: row.slaveId, timeoutMs: row.timeoutMs,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({ message: "استجابة البوابة غير صالحة." }));
      const latencyMs = Date.now() - started;
      if (!response.ok || data.ok !== true) {
        await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastStatus: "error", lastTestResult: "error", lastTestLatencyMs: latencyMs, lastTestReason: data.message || "gateway_error" } });
        return NextResponse.json({ ok: false, source: "gateway", latencyMs, ...data }, { status: 502 });
      }
      await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastStatus: "connected", lastSeenAt: new Date(), lastTestResult: "success", lastTestLatencyMs: latencyMs, lastTestReason: null } });
      return NextResponse.json({ ...data, ok: true, source: "gateway", latencyMs });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "انتهت مهلة اختبار الاتصال. تحقق من البوابة والإنفرتر." : error instanceof Error ? error.message : "تعذر اختبار الاتصال.";
    return NextResponse.json({ ok: false, source: "gateway", error: "gateway_connection_failed", message }, { status: 502 });
  }
}
