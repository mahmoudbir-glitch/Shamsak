import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

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
  panelAzimuth: z.number().finite().min(0).max(360).nullable().optional(),
  batteryNominalVoltage: z.number().int().refine((v) => [12, 24, 48].includes(v), "جهد البطارية يجب أن يكون 12 أو 24 أو 48 فولت.").optional(),
  batteryChemistry: z.enum(["LiFePO4", "Lithium-ion", "Lead-acid", "Gel", "AGM"]).nullable().optional(),
  batteryMinReservePct: z.number().finite().min(0).max(100).optional(),
  batteryMaxChargeA: z.number().finite().positive().nullable().optional(),
  batteryMaxDischargeA: z.number().finite().positive().nullable().optional(),
  inverterRatedPowerKw: z.number().finite().positive().nullable().optional(),
  gridPhase: z.enum(["single", "three"]).optional(),
  retentionDays: z.union([z.literal(30), z.literal(90), z.literal(180), z.literal(365), z.literal(0)]).optional(),
  pollIntervalSec: z.union([z.literal(5), z.literal(10), z.literal(30), z.literal(60)]).optional(),
  lowBatteryPct: z.number().finite().min(5).max(50).optional(),
  criticalBatteryPct: z.number().finite().min(5).max(30).optional(),
  gridOutageAlert: z.boolean().optional(),
  faultAlert: z.boolean().optional(),
  offlineMinutes: z.number().int().min(2).max(120).optional(),
  overloadPct: z.number().finite().min(50).max(100).optional(),
  channels: z.enum(["in_app", "email"]).optional(),
  quietHoursStart: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).nullable().optional(),
});

async function getSession(request: NextRequest) {
  return verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
}

async function writeAudit(username: string, action: string, before: Record<string, unknown>, after: Record<string, unknown>) {
  try {
    const user = await prisma.user.findUnique({ where: { email: username } });
    if (!user) return;
    const sensitive = new Set(["password", "passwordHash", "gatewayTokenHash", "wifiPasswordCipher"]);
    const clean = (value: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(value).filter(([key]) => !sensitive.has(key)));
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        details: JSON.stringify({ before: clean(before), after: clean(after) }).slice(0, 8000),
      },
    });
  } catch (error) {
    console.error("[settings] audit_write_failed", error);
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL)) {
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
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL)) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "البيانات المرسلة غير صالحة." }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: "invalid_settings", message: first?.message || "تحقق من القيم المدخلة.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  if (
    parsed.data.criticalBatteryPct !== undefined &&
    parsed.data.lowBatteryPct !== undefined &&
    parsed.data.criticalBatteryPct > parsed.data.lowBatteryPct
  ) {
    return NextResponse.json({ error: "invalid_battery_thresholds", message: "حد البطارية الحرجة يجب ألا يتجاوز حد البطارية المنخفضة." }, { status: 422 });
  }

  try {
    const previous = await prisma.energySettings.upsert({ where: { id: "default" }, create: {}, update: {} });
    const settings = await prisma.energySettings.update({
      where: { id: "default" },
      data: parsed.data,
    });
    await writeAudit(session.username, "SETTINGS_SAVED", previous as unknown as Record<string, unknown>, settings as unknown as Record<string, unknown>);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "settings_write_failed", message: "تعذر حفظ الإعدادات. لم تُحذف القيم السابقة." }, { status: 503 });
  }
}
