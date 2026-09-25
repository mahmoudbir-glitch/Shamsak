import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  panelPowerW: z.number().finite().positive().optional(),
  batteryCapacityWh: z.number().finite().positive().optional(),
  gridTariff: z.number().finite().nonnegative().optional(),
  exportTariff: z.number().finite().nonnegative().optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  panelTilt: z.number().finite().min(0).max(90).nullable().optional(),
  panelAzimuth: z.number().finite().min(-180).max(180).nullable().optional(),
});

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  try {
    const settings = await prisma.energySettings.upsert({
      where: { id: "default" },
      create: {},
      update: {},
    });
    return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "settings_read_failed" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  if (process.env.SETTINGS_API_TOKEN) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.SETTINGS_API_TOKEN}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_settings", issues: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const settings = await prisma.energySettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...parsed.data },
      update: parsed.data,
    });
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "settings_write_failed" }, { status: 503 });
  }
}
