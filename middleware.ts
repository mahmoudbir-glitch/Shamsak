import { NextRequest,NextResponse } from "next/server";
import { COOKIE_NAME,verifySessionToken } from "@/lib/auth-session";

export async function middleware(request:NextRequest){
  const pathname=request.nextUrl.pathname;
  const session=await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if(pathname==="/login") return session?NextResponse.redirect(new URL("/",request.url)):NextResponse.next();
  if(session) return NextResponse.next();
  const url=new URL("/login",request.url);
  url.searchParams.set("next",pathname);
  return NextResponse.redirect(url);
}
export const config={matcher:["/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt).*)"]};
