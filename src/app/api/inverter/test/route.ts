import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { assertPublicEndpoint, PrivateEndpointError } from "@/lib/net-guard";
import { decryptSecret } from "@/lib/inverter-config-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A cloud round trip needs more headroom than the Modbus read timeout, whose
// default is 1000ms. Using timeoutMs directly made healthy servers look dead.
const MIN_REMOTE_TIMEOUT_MS = 5000;
const remoteTimeout = (timeoutMs: number) => Math.max(MIN_REMOTE_TIMEOUT_MS, timeoutMs);

function configured() {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL);
}

/**
 * The gateway expects `Authorization: Bearer <token>`. Shamsak stores a one-way
 * hash for verification plus a reversible copy, so a test works at any time and
 * not only in the few seconds after the token was rotated.
 */
function gatewayAuthHeader(cipher: string | null, incoming: string) {
  if (cipher) {
    try {
      const token = decryptSecret(cipher);
      if (token) return { Authorization: "Bearer " + token };
    } catch (error) {
      console.error("[inverter] gateway_token_decrypt_failed", error);
    }
  }
  if (incoming) return { Authorization: incoming };
  if (process.env.SHAMSAK_GATEWAY_TOKEN) return { Authorization: "Bearer " + process.env.SHAMSAK_GATEWAY_TOKEN };
  return {};
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

    if (row.connectionMode === "local" || (row.protocol === "Modbus RTU" && !row.gatewayUrl)) {
      return NextResponse.json({ ok: false, error: "serial_port_unavailable", message: "المنفذ التسلسلي غير متاح من السحابة. استخدم بوابة محلية على الجهاز المتصل بالإنفرتر." }, { status: 422 });
    }

    if (row.protocol === "Wi-Fi Datalogger") {
      const cloudUrl = process.env.SHAMSAK_DESSMONITOR_URL || "https://api.dessmonitor.com/public/";
      const started = Date.now();
      try {
        const response = await fetch(cloudUrl, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(remoteTimeout(row.timeoutMs)) });
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
    try { safeGateway = await assertPublicEndpoint(gatewayUrl); }
    catch (error) {
      const message = error instanceof PrivateEndpointError
        ? "بوابة البيانات تستخدم عنواناً محلياً لا يمكن الوصول إليه من Vercel. انشر البوابة عبر HTTPS أو استخدم نفقاً آمناً."
        : "عنوان بوابة البيانات غير صالح.";
      await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastTestResult: "error", lastTestReason: message } });
      return NextResponse.json({ ok: false, error: "invalid_gateway", message }, { status: 422 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remoteTimeout(row.timeoutMs));
    const started = Date.now();
    try {
      const response = await fetch(safeGateway + "/v1/inverter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...gatewayAuthHeader(row.gatewayTokenCipher, incomingGatewayToken) },
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
