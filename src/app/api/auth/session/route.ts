import { NextRequest,NextResponse } from "next/server";
import { COOKIE_NAME,verifySessionToken } from "@/lib/auth-session";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const session=await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if(!session) return NextResponse.json({authenticated:false},{status:401});
  return NextResponse.json({authenticated:true,username:session.username});
}
