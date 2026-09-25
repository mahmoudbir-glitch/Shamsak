import { NextRequest, NextResponse } from "next/server";
import { createAuthToken, AUTH_COOKIE, AUTH_MAX_AGE } from "@/lib/auth";

export const runtime = "nodejs";

function safeRedirect(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const configuredUsername = process.env.ADMIN_USERNAME;
    const configuredPassword = process.env.ADMIN_PASSWORD;
    const secret = process.env.AUTH_SECRET;

    if (!configuredUsername || !configuredPassword || !secret) {
      return NextResponse.json({ error: "إعدادات تسجيل الدخول غير مكتملة على الخادم." }, { status: 500 });
    }

    if (username !== configuredUsername || password !== configuredPassword) {
      return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }, { status: 401 });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + AUTH_MAX_AGE;
    const token = createAuthToken(username, expiresAt);
    const response = NextResponse.json({ ok: true, redirectTo: safeRedirect(body.next) });

    response.cookies.set({
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "تعذر تنفيذ تسجيل الدخول." }, { status: 500 });
  }
}
