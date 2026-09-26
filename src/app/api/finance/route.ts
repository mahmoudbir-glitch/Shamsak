import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startDateFor(period: string) {
  const now = new Date();
  const days = period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  return start;
}

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  const requested = request.nextUrl.searchParams.get("period") ?? "month";
  const period = ["day", "week", "month"].includes(requested) ? requested : "month";

  try {
    const rows = await prisma.dailySummary.findMany({
      where: { day: { gte: startDateFor(period) } },
      orderBy: { day: "desc" },
      take: period === "day" ? 1 : period === "week" ? 7 : 30,
    });

    const totals = rows.reduce(
      (acc, row) => ({
        solarKWh: acc.solarKWh + row.solarKWh,
        homeKWh: acc.homeKWh + row.homeKWh,
        batteryDischargeKWh: acc.batteryDischargeKWh + row.batteryDischargeKWh,
        gridImportKWh: acc.gridImportKWh + row.gridImportKWh,
        gridExportKWh: acc.gridExportKWh + row.gridExportKWh,
      }),
      { solarKWh: 0, homeKWh: 0, batteryDischargeKWh: 0, gridImportKWh: 0, gridExportKWh: 0 },
    );

    const directSolarKWh = Math.max(
      0,
      Math.min(totals.homeKWh, totals.solarKWh - totals.batteryDischargeKWh - totals.gridExportKWh),
    );
    const batteryKWh = Math.min(Math.max(0, totals.homeKWh - directSolarKWh), totals.batteryDischargeKWh);
    const gridKWh = Math.max(0, totals.gridImportKWh);
    const served = Math.max(0, totals.homeKWh);
    const accounted = Math.min(served, directSolarKWh + batteryKWh + gridKWh);
    const unknownKWh = Math.max(0, served - accounted);
    const solarAndBatteryKWh = Math.min(served, directSolarKWh + batteryKWh);
    const coveragePct = served > 0 ? Math.round((solarAndBatteryKWh / served) * 100) : 0;

    const settings = await prisma.energySettings.findUnique({ where: { id: "default" } });
    const tariff = settings?.gridTariff ?? 0;
    const exportTariff = settings?.exportTariff ?? 0;
    const hypotheticalCost = served * tariff;
    const actualGridCost = gridKWh * tariff;
    const avoidedCost = Math.max(0, hypotheticalCost - actualGridCost);
    const unaccountedCost = unknownKWh * tariff;

    return NextResponse.json(
      {
        period,
        periodDays: rows.length,
        totals,
        sources: {
          solarPct: served > 0 ? Math.round((directSolarKWh / served) * 100) : 0,
          batteryPct: served > 0 ? Math.round((batteryKWh / served) * 100) : 0,
          gridPct: served > 0 ? Math.round((gridKWh / served) * 100) : 0,
          solarKWh: Math.round(directSolarKWh * 10) / 10,
          batteryKWh: Math.round(batteryKWh * 10) / 10,
          gridKWh: Math.round(gridKWh * 10) / 10,
        },
        coverage: { kWh: Math.round(solarAndBatteryKWh * 10) / 10, pct: coveragePct },
        unknown: {
          kWh: Math.round(unknownKWh * 10) / 10,
          cost: Math.round(unaccountedCost * 100) / 100,
        },
        financial: {
          tariff,
          exportTariff,
          actualGridCost: Math.round(actualGridCost * 100) / 100,
          hypotheticalCost: Math.round(hypotheticalCost * 100) / 100,
          avoidedCost: Math.round(avoidedCost * 100) / 100,
        },
        currency: settings?.currency ?? "USD",
        source: "daily_summary",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "finance_read_failed" }, { status: 503 });
  }
}
