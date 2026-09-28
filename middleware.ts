import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, LOGOUT_MARKER_COOKIE, verifySessionToken } from "@/lib/auth-session";

const PUBLIC_PATHS = new Set(["/login"]);

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // The login page must always be reachable, even if Vercel environment
  // variables are temporarily missing. The API will report a clear error
  // when credentials are submitted.
  if (PUBLIC_PATHS.has(pathname)) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const loggedOut = request.cookies.get(LOGOUT_MARKER_COOKIE)?.value === "1";
    const session = loggedOut ? null : await verifySessionToken(token);

    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  }

  // Every application page requires a valid signed session cookie.
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const loggedOut = request.cookies.get(LOGOUT_MARKER_COOKIE)?.value === "1";
  const session = loggedOut ? null : await verifySessionToken(token);

  if (session) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    return response;
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: [
    "/((?!api/auth/|api/telemetry(?:/|$)|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt).*)",
  ],
};
