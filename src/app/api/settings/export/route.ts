import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replaceAll('"', '""') + '"';
}

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const rows = await prisma.telemetryLog.findMany({ orderBy: { timestamp: "asc" } });
    const header = ["timestamp","pv_power_w","load_power_w","battery_soc","battery_power_w","battery_voltage","battery_current","battery_temperature","grid_connected","grid_power_w","source"];
    const body = rows.map((row) => [
      row.timestamp.toISOString(), row.pvPowerW, row.loadPowerW, row.batterySoc, row.batteryPowerW,
      row.batteryVoltage, row.batteryCurrent, row.batteryTemperature, row.gridConnected, row.gridPowerW, row.source,
    ].map(csvCell).join(","));
    const csv = "\uFEFF" + [header.join(","), ...body].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="shamsak-telemetry.csv"' } });
  } catch {
    return NextResponse.json({ error: "export_failed", message: "تعذر تصدير البيانات." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { confirm?: unknown } = {};
  try { body = await request.json(); } catch {}
  if (body.confirm !== "مسح السجل") return NextResponse.json({ error: "confirmation_required", message: "اكتب «مسح السجل» للتأكيد." }, { status: 422 });
  try {
    const result = await prisma.telemetryLog.deleteMany({});
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch {
    return NextResponse.json({ error: "delete_failed", message: "تعذر مسح السجل." }, { status: 503 });
  }
}
