import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL)) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  try {
    const rows = await prisma.dailySummary.findMany({
      orderBy: { day: "desc" },
      take: 30,
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
    const batteryKWh = Math.min(totals.homeKWh - directSolarKWh, totals.batteryDischargeKWh);
    const gridKWh = totals.gridImportKWh;
    const served = Math.max(0.001, directSolarKWh + batteryKWh + gridKWh);

    return NextResponse.json(
      {
        periodDays: rows.length,
        totals,
        sources: {
          solarPct: Math.round((directSolarKWh / served) * 100),
          batteryPct: Math.round((batteryKWh / served) * 100),
          gridPct: Math.round((gridKWh / served) * 100),
          solarKWh: Math.round(directSolarKWh * 10) / 10,
          batteryKWh: Math.round(batteryKWh * 10) / 10,
          gridKWh: Math.round(gridKWh * 10) / 10,
        },
        source: "daily_summary",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "finance_read_failed" }, { status: 503 });
  }
}
