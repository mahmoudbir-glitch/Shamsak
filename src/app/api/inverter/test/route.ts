import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrivateIp(address: string) {
  const normalized = address.trim().toLowerCase();
  const ipv4Mapped = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    normalized === "localhost" ||
    ipv4Mapped === "127.0.0.1" ||
    ipv4Mapped.startsWith("10.") ||
    ipv4Mapped.startsWith("192.168.") ||
    ipv4Mapped.startsWith("169.254.")
  ) return true;
  const match = ipv4Mapped.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  if (/^(fc|fd|fe8[0-9a-f]:)/.test(normalized)) return true;
  return false;
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
    const incomingGatewayToken = request.headers.get("authorization") || "";
    const row = await prisma.inverterConnection.findFirst({ where: { isPrimary: true } }) ?? await prisma.inverterConnection.findUnique({ where: { id: "default" } });
    if (!row) return NextResponse.json({ ok: false, error: "inverter_not_configured", message: "لم تتم إضافة إنفرتر بعد." }, { status: 422 });

    if (row.connectionMode === "local" || row.protocol === "Modbus RTU" && !row.gatewayUrl) {
      return NextResponse.json({ ok: false, error: "serial_port_unavailable", message: "المنفذ التسلسلي غير متاح من السحابة. استخدم بوابة محلية على الجهاز المتصل بالإنفرتر." }, { status: 422 });
    }

    if (row.protocol === "Wi-Fi Datalogger") {
      const cloudUrl = process.env.SHAMSAK_DESSMONITOR_URL || "https://api.dessmonitor.com/public/";
      const started = Date.now();
      try {
        const response = await fetch(cloudUrl, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(row.timeoutMs) });
        const latencyMs = Date.now() - started;
        await prisma.inverterConnection.update({
          where: { id: row.id },
          data: {
            lastStatus: response.ok ? "connected" : "error",
            lastTestResult: response.ok ? "success" : "error",
            lastTestLatencyMs: latencyMs,
            lastTestReason: response.ok ? "تم الوصول إلى خادم DESSMonitor. يلزم رمز المصادقة ومعرّفات الجهاز لإجراء قراءة فعلية." : "تعذر الوصول إلى خادم DESSMonitor.",
          },
        });
        if (!response.ok) return NextResponse.json({ ok: false, source: "dessmonitor", latencyMs, error: "cloud_unreachable", message: "تم إعداد الدنجل، لكن خادم DESSMonitor لم يستجب من بيئة شمسك." }, { status: 502 });
        return NextResponse.json({
          ok: true,
          source: "dessmonitor",
          latencyMs,
          message: "تم الوصول إلى DESSMonitor بنجاح. هذا اختبار للخادم فقط؛ القراءة الفعلية تحتاج token وDevCode وDevAddr وSN من حساب SmartESS.",
          device: {
            dataloggerPn: row.dataloggerPn,
            dataloggerStationName: row.dataloggerStationName,
            dataloggerDeviceIdentifier: row.dataloggerDeviceIdentifier,
          },
        });
      } catch {
        await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastStatus: "error", lastTestResult: "error", lastTestReason: "تعذر الوصول إلى DESSMonitor من بيئة شمسك." } }).catch(() => {});
        return NextResponse.json({ ok: false, source: "dessmonitor", error: "cloud_connection_failed", message: "تعذر الوصول إلى خادم DESSMonitor من شمسك." }, { status: 502 });
      }
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
        headers: { "Content-Type": "application/json", ...(incomingGatewayToken ? { Authorization: incomingGatewayToken } : process.env.SHAMSAK_GATEWAY_TOKEN ? { Authorization: "Bearer " + process.env.SHAMSAK_GATEWAY_TOKEN } : {}) },
        body: JSON.stringify({
          enabled: row.enabled,
          protocol: row.protocol === "Modbus TCP" ? "modbus-tcp" : row.protocol === "Wi-Fi Datalogger" ? "wifi-gateway" : "modbus-rtu",
          manufacturer: row.manufacturer || "Next Power", model: row.inverterModel || "NEXT - Victor Max 8.2KW",
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
