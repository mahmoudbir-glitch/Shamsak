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
        manufacturer: row.manufacturer,
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
  const panelCapacityKw = typeof input.panelCapacityKw === "number" ? input.panelCapacityKw : Number(input.panelCapacityKw);
  const batteryCapacityWh = typeof input.batteryCapacityWh === "number" ? input.batteryCapacityWh : Number(input.batteryCapacityWh);

  if (!text(input.systemName)) {
    return NextResponse.json({ error: "missing_connection_fields" }, { status: 400 });
  }

  if (
    input.panelCapacityKw !== undefined &&
    (!Number.isFinite(panelCapacityKw) || panelCapacityKw <= 0) 
  ) {
    return NextResponse.json({ error: "invalid_panel_capacity" }, { status: 422 });
  }

  if (
    input.batteryCapacityWh !== undefined &&
    (!Number.isFinite(batteryCapacityWh) || batteryCapacityWh <= 0)
  ) {
    return NextResponse.json({ error: "invalid_battery_capacity" }, { status: 422 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inverterConnection.findUnique({ where: { id: "default" } });
      const row = await tx.inverterConnection.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          systemName: text(input.systemName),
          inverterModel: text(input.inverterModel) || "Felicity",
          manufacturer: text(input.manufacturer) || null,
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
          manufacturer: text(input.manufacturer) || null,
          protocol: text(input.protocol) || "Wi-Fi Datalogger",
          inverterAddress: text(input.inverterAddress) || null,
          inverterUsername: text(input.inverterUsername) || null,
          inverterLinkCode: text(input.inverterLinkCode) || null,
          wifiSsid: text(input.wifiSsid),
          ...(wifiPassword ? { wifiPasswordCipher: encryptSecret(wifiPassword) } : {}),
        },
      });

      if (input.panelCapacityKw !== undefined || input.batteryCapacityWh !== undefined) {
        const current = await tx.energySettings.findUnique({ where: { id: "default" } });
        await tx.energySettings.upsert({
          where: { id: "default" },
          create: {
            id: "default",
            panelPowerW: panelCapacityKw * 1000,
            batteryCapacityWh,
          },
          update: {
            ...(input.panelCapacityKw !== undefined ? { panelPowerW: panelCapacityKw * 1000 } : {}),
            ...(input.batteryCapacityWh !== undefined ? { batteryCapacityWh } : {}),
          },
        });
        void current;
      }

      return {
        row,
        preservedPassword: Boolean(existing?.wifiPasswordCipher && !wifiPassword),
      };
    });

    return NextResponse.json({
      saved: true,
      hasWifiPassword: Boolean(result.row.wifiPasswordCipher),
      preservedPassword: result.preservedPassword,
    });
  } catch (error) {
    console.error("inverter_config_write_failed", error);
    return NextResponse.json({ error: "inverter_config_write_failed" }, { status: 503 });
  }
}
