import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { verifyPassword } from "@/lib/auth-password";
import { clearLogoutMarkerCookie, createSessionToken, sessionCookie } from "@/lib/auth-session";
import { getAuthConfig } from "@/lib/auth-config";
import { MONITORING_ACTIONS, recordMonitoringEvent } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const input = body as { username?: unknown; password?: unknown; next?: unknown };
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const next =
    typeof input.next === "string" && input.next.startsWith("/") && !input.next.startsWith("//")
      ? input.next
      : "/";

  if (!username || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const config = getAuthConfig();
  if (!config.configured) {
    console.error("[auth] Missing SHAMSAK_USER, SHAMSAK_PASSWORD or AUTH_SECRET configuration.");
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }

  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const state = attempts.get(key);

  if (state && state.resetAt > now && state.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  if (!state || state.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
  }

  const ownerLogin =
    Boolean(config.ownerUsername && config.ownerPassword) &&
    safeEqual(username, config.ownerUsername) &&
    safeEqual(password, config.ownerPassword);

  const usernameOk = safeEqual(username, config.username);
  const passwordOk = config.password
    ? safeEqual(password, config.password)
    : verifyPassword(password, config.passwordHash);

  if (!ownerLogin && (!usernameOk || !passwordOk)) {
    const nextState = attempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
    nextState.count++;
    attempts.set(key, nextState);
    await recordMonitoringEvent({
      action: MONITORING_ACTIONS.LOGIN_FAILED,
      username: username || null,
      success: false,
      details: usernameOk ? "password_mismatch" : "username_mismatch",
    });
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 },
    );
  }

  attempts.delete(key);

  try {
    const sessionUsername = ownerLogin ? config.ownerUsername : config.username;
    const token = await createSessionToken(sessionUsername);
    await recordMonitoringEvent({
      action: MONITORING_ACTIONS.LOGIN_SUCCESS,
      username: sessionUsername,
      success: true,
      details: ownerLogin ? "Owner session created." : "User session created.",
    });
    const response = NextResponse.json({ ok: true, redirectTo: next });
    response.cookies.set(sessionCookie(token));
    response.cookies.set(clearLogoutMarkerCookie());
    return response;
  } catch (error) {
    console.error("[auth] Session creation failed:", error);
    return NextResponse.json({ error: "session_creation_failed" }, { status: 500 });
  }
}
