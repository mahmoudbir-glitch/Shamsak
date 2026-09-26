import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-password";
import { createSessionToken, sessionCookie } from "@/lib/auth-session";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const attempts=new Map<string,{count:number;resetAt:number}>();
const WINDOW_MS=10*60*1000;
const MAX_ATTEMPTS=5;

export async function POST(request:NextRequest){
  let body:unknown;
  try{body=await request.json();}catch{return NextResponse.json({error:"invalid_json"},{status:400});}
  const b=body as {username?:unknown;password?:unknown};
  const username=typeof b.username==="string"?b.username.trim():"";
  const password=typeof b.password==="string"?b.password:"";
  if(!username||!password) return NextResponse.json({error:"missing_credentials"},{status:400});

  const configuredUsername=process.env.SHAMSAK_USERNAME;
  const configuredHash=process.env.SHAMSAK_PASSWORD_HASH;
  if(!configuredUsername||!configuredHash||!process.env.AUTH_SECRET)
    return NextResponse.json({error:"auth_not_configured"},{status:503});

  const key=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const now=Date.now();
  const state=attempts.get(key);
  if(state&&state.resetAt>now&&state.count>=MAX_ATTEMPTS)
    return NextResponse.json({error:"too_many_attempts"},{status:429});

  if(!state||state.resetAt<=now) attempts.set(key,{count:0,resetAt:now+WINDOW_MS});
  const ok=username===configuredUsername&&verifyPassword(password,configuredHash);
  if(!ok){
    const next=attempts.get(key)||{count:0,resetAt:now+WINDOW_MS};
    next.count++;
    attempts.set(key,next);
    return NextResponse.json({error:"invalid_credentials"},{status:401});
  }

  attempts.delete(key);
  const response=NextResponse.json({ok:true});
  response.cookies.set(sessionCookie(await createSessionToken(configuredUsername)));
  return response;
}
