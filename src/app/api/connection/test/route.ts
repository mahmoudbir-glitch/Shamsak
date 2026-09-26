import { NextRequest, NextResponse } from "next/server";
import { sanitizeConnection } from "@/lib/inverter-connection";

export const runtime = "nodejs";

function isHttpEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

    if (!isHttpEndpoint(config.endpoint)) {
      return NextResponse.json({
        ok: false,
        message: "عنوان الاختبار الحالي ليس HTTP/HTTPS. اختبر بوابة Modbus/RTU عبر HTTP أو استخدم بوابة البيانات الفعلية.",
      }, { status: 422 });
    }

    const result = await probeHttp(config.endpoint);

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
