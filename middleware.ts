import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "shamsak_auth";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifyToken(token: string | undefined) {
  if (!token || !process.env.AUTH_SECRET) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, decodeBase64Url(signature), new TextEncoder().encode(payload));
    if (!valid) return false;
    const decoded = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as { username?: string; exp?: number };
    return decoded.username === process.env.ADMIN_USERNAME && typeof decoded.exp === "number" && decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (await verifyToken(request.cookies.get(COOKIE_NAME)?.value)) return NextResponse.next();
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login(?:/.*)?$|api/auth(?:/.*)?$|_next/static|_next/image|favicon.ico|icon(?:/.*)?$|manifest.webmanifest|robots.txt).*)"],
};
