import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "shamsak_auth";
export const AUTH_MAX_AGE = 60 * 60 * 8;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getRequiredEnv("AUTH_SECRET"))
    .update(value)
    .digest("base64url");
}

export function createAuthToken(username: string, expiresAt: number) {
  const payload = toBase64Url(JSON.stringify({ username, exp: expiresAt }));
  return `${payload}.${sign(payload)}`;
}

export function verifyAuthToken(token: string | undefined) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      username?: string;
      exp?: number;
    };
    const configuredUsername = getRequiredEnv("ADMIN_USERNAME");
    return decoded.username === configuredUsername && typeof decoded.exp === "number" && decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
