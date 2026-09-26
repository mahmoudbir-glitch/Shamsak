import { NextRequest,NextResponse } from "next/server";
import { COOKIE_NAME,verifySessionToken } from "@/lib/auth-session";

function authConfigured(){
  return Boolean(
    process.env.SHAMSAK_USER &&
    (process.env.SHAMSAK_PASSWORD || process.env.SHAMSAK_PASSWORD_HASH) &&
    process.env.AUTH_SECRET
  );
}

export async function middleware(request:NextRequest){
  const pathname=request.nextUrl.pathname;

  if(pathname==="/login"){
    const session=await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
    return session && authConfigured()
      ? NextResponse.redirect(new URL("/",request.url))
      : NextResponse.next();
  }

  if(!authConfigured()){
    const url=new URL("/login",request.url);
    url.searchParams.set("next",pathname);
    return NextResponse.redirect(url);
  }

  const session=await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if(session) return NextResponse.next();

  const url=new URL("/login",request.url);
  url.searchParams.set("next",pathname);
  return NextResponse.redirect(url);
}

export const config={
  matcher:["/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt).*)"]
};