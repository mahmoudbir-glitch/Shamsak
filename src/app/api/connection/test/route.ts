import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { sanitizeConnection } from "@/lib/inverter-connection";

export const runtime = "nodejs";

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase();

  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("169.254.") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  ) {
    return true;
  }

  const match = normalized.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

async function validatePublicEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("endpoint_protocol");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || isPrivateIp(host)) {
    throw new Error("private_endpoint");
  }

  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("private_endpoint");
  }

  return url.toString();
}

async function probeHttp(endpoint: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "application/json,text/plain,*/*" },
    });

    return {
      ok: response.status >= 200 && response.status < 500,
      status: response.status,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = sanitizeConnection(body);

    if (!config.enabled) {
      return NextResponse.json({ ok: false, message: "فعّل مصدر الطاقة أولًا، ثم أعد الاختبار." }, { status: 400 });
    }

    if (!config.protocol || config.protocol === "auto") {
      return NextResponse.json({ ok: false, message: "اختر بروتوكولًا معروفًا قبل اختبار الاتصال." }, { status: 400 });
    }

    if (!config.endpoint) {
      return NextResponse.json({ ok: false, message: "أدخل عنوان الاتصال أو بوابة البيانات." }, { status: 400 });
    }

    let endpoint: string;
    try {
      endpoint = await validatePublicEndpoint(config.endpoint);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      const message = reason === "private_endpoint"
        ? "لأمان الخادم لا يمكن اختبار عناوين الشبكات المحلية مباشرة من Vercel. استخدم بوابة عامة أو ESP32 لإرسال telemetry إلى شمسك."
        : "أدخل عنوان HTTP/HTTPS صالحًا لبوابة البيانات.";
      return NextResponse.json({ ok: false, message }, { status: 422 });
    }

    const result = await probeHttp(endpoint);

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        message: `وصل الطلب إلى العنوان لكن الاستجابة غير صالحة كقناة بيانات (HTTP ${result.status}).`,
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      message: `تم الوصول إلى بوابة البيانات بنجاح (HTTP ${result.status}). هذا يثبت الوصول إلى الـ endpoint، وليس صحة كل سجلات الإنفرتر.`,
      httpStatus: result.status,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "انتهت مهلة اختبار الاتصال بعد 4.5 ثوانٍ."
      : "تعذر الوصول إلى عنوان الاتصال. تحقق من العنوان والمنفذ والبوابة.";

    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
