import { timingSafeEqual } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { telemetryInputSchema, telemetryToSnapshot } from "@/lib/telemetry";
import { ingestSample } from "@/lib/telemetry-store";
import { syncSmartEss } from "@/lib/smartess-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// أي قراءة أقدم من هذه المدة تعتبر "قديمة" ولا تُعرض كبيانات حية
const STALE_AFTER_SEC = 180;

function unauthorized() {
  return NextResponse.json({ error: "telemetry_unauthorized" }, { status: 401 });
}

// نفس القائمة المستخدمة في route الإعدادات، حتى لا يختلف السلوك بين المسارين
function configured() {
  return Boolean(
    process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL,
  );
}

// مقارنة ثابتة الزمن لمنع تسريب التوكن عبر توقيت الاستجابة
function validToken(request: NextRequest) {
  const expected = process.env.TELEMETRY_INGEST_TOKEN;
  if (!expected) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${expected}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (process.env.SHAMSAK_MOCK_INVERTER === "true") {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        solarPowerW: 4200,
        homePowerW: 3350,
        gridPowerW: 0,
        batteryPowerW: 850,
        batterySoc: 78,
        batteryVoltage: 51.2,
        batteryCurrent: 16.6,
        batteryTemperature: 28,
        gridConnected: false,
        source: "mock",
        stale: false,
        ageSeconds: 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!configured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  // Refresh from the SmartESS cloud after responding; it throttles itself.
  after(() => { void syncSmartEss(); });

  try {
    const row = await prisma.telemetryLog.findFirst({ orderBy: { timestamp: "desc" } });
    if (!row) return NextResponse.json({ error: "no_telemetry" }, { status: 404 });

    const ageSeconds = Math.max(0, Math.round((Date.now() - row.timestamp.getTime()) / 1000));

    return NextResponse.json(
      {
        timestamp: row.timestamp.toISOString(),
        solarPowerW: row.pvPowerW,
        homePowerW: row.loadPowerW,
        gridPowerW: row.gridPowerW ?? 0,
        batteryPowerW: row.batteryPowerW,
        batterySoc: row.batterySoc,
        batteryVoltage: row.batteryVoltage ?? undefined,
        batteryCurrent: row.batteryCurrent ?? undefined,
        batteryTemperature: row.batteryTemperature ?? undefined,
        gridConnected: row.gridConnected,
        source: "live",
        // الواجهة تستطيع الآن إظهار "غير متصل" بدل عرض قراءة قديمة كأنها لحظية
        stale: ageSeconds > STALE_AFTER_SEC,
        ageSeconds,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[telemetry] read_failed", error);
    return NextResponse.json({ error: "telemetry_read_failed" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!configured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  // رسالة واضحة بدل 401 مبهم عندما يكون المتغير غير مضبوط في Vercel
  if (!process.env.TELEMETRY_INGEST_TOKEN) {
    console.error("[telemetry] TELEMETRY_INGEST_TOKEN is not set");
    return NextResponse.json({ error: "telemetry_token_not_configured" }, { status: 503 });
  }
  if (!validToken(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = telemetryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_telemetry", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const input = parsed.data;

  try {
    await ingestSample(input);
  } catch (error) {
    console.error("[telemetry] write_failed", error);
    return NextResponse.json({ error: "telemetry_write_failed" }, { status: 503 });
  }

  return NextResponse.json(
    { accepted: true, stored: true, snapshot: telemetryToSnapshot(input) },
    { status: 201 },
  );
}
