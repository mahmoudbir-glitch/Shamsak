import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/inverter-config-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configured() {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL);
}

export async function GET() {
  if (!configured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const row = await prisma.inverterConnection.findUnique({ where: { id: "default" } });
    if (!row) return NextResponse.json({ configured: false, connection: null });
    return NextResponse.json({
      configured: true,
      connection: {
        id: row.id,
        systemName: row.systemName,
        inverterModel: row.inverterModel,
        protocol: row.protocol,
        inverterAddress: row.inverterAddress,
        inverterUsername: row.inverterUsername,
        inverterLinkCode: row.inverterLinkCode,
        wifiSsid: row.wifiSsid,
        hasWifiPassword: Boolean(row.wifiPasswordCipher),
        enabled: row.enabled,
        lastStatus: row.lastStatus,
        lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "inverter_config_read_failed" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const input = body as Record<string, unknown>;
  const text = (value: unknown, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const wifiPassword = typeof input.wifiPassword === "string" ? input.wifiPassword : "";

  if (!text(input.systemName)) {
    return NextResponse.json({ error: "missing_connection_fields" }, { status: 400 });
  }

  try {
    const existing = await prisma.inverterConnection.findUnique({ where: { id: "default" } });
    const row = await prisma.inverterConnection.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        systemName: text(input.systemName),
        inverterModel: text(input.inverterModel) || "Felicity",
        protocol: text(input.protocol) || "Wi-Fi Datalogger",
        inverterAddress: text(input.inverterAddress) || null,
        inverterUsername: text(input.inverterUsername) || null,
        inverterLinkCode: text(input.inverterLinkCode) || null,
        wifiSsid: text(input.wifiSsid),
        wifiPasswordCipher: wifiPassword ? encryptSecret(wifiPassword) : null,
      },
      update: {
        systemName: text(input.systemName),
        inverterModel: text(input.inverterModel) || "Felicity",
        protocol: text(input.protocol) || "Wi-Fi Datalogger",
        inverterAddress: text(input.inverterAddress) || null,
        inverterUsername: text(input.inverterUsername) || null,
        inverterLinkCode: text(input.inverterLinkCode) || null,
        wifiSsid: text(input.wifiSsid),
        ...(wifiPassword ? { wifiPasswordCipher: encryptSecret(wifiPassword) } : {}),
      },
    });
    return NextResponse.json({ saved: true, hasWifiPassword: Boolean(row.wifiPasswordCipher), preservedPassword: Boolean(existing?.wifiPasswordCipher && !wifiPassword) });
  } catch {
    return NextResponse.json({ error: "inverter_config_write_failed" }, { status: 503 });
  }
}
