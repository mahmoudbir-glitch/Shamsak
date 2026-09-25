import { NextResponse } from "next/server";
import { createAuthToken, AUTH_COOKIE, AUTH_MAX_AGE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: unknown; password?: unknown };
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    const configuredUsername = process.env.ADMIN_USERNAME;
    const configuredPassword = process.env.ADMIN_PASSWORD;

    if (!configuredUsername || !configuredPassword || username !== configuredUsername || password !== configuredPassword) {
      return NextResponse.json({ error: "بيانات تسجيل الدخول غير صحيحة." }, { status: 401 });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + AUTH_MAX_AGE;
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: AUTH_COOKIE,
      value: createAuthToken(username, expiresAt),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: AUTH_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "تعذر تنفيذ تسجيل الدخول." }, { status: 400 });
  }
}
