import { NextRequest, NextResponse } from "next/server";
import { sanitizeConnection } from "@/lib/inverter-connection";

export const runtime = "nodejs";

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

    if (!config.endpoint && config.protocol !== "csv") {
      return NextResponse.json({ ok: false, message: "أدخل عنوان الاتصال أو بوابة البيانات." }, { status: 400 });
    }

    // The project currently has no vendor-specific adapter registered.
    // Never report a live connection until a protocol adapter actually verifies it.
    return NextResponse.json({
      ok: false,
      message: "لم يتم تسجيل Adapter لهذا البروتوكول بعد؛ لم يتم اعتبار المنظومة متصلة ولم تُعرض بيانات حقيقية.",
    }, { status: 501 });
  } catch {
    return NextResponse.json({ ok: false, message: "إعدادات الربط غير صالحة." }, { status: 400 });
  }
}
