import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assessNightEndurance, findSurplusWindows } from "@/lib/predictions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const latest = await prisma.telemetryLog.findFirst({ orderBy: { timestamp: "desc" } });
    const recent = await prisma.telemetryLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 288,
    });

    const averageNightLoadKW = (() => {
      const night = recent.filter((row) => {
        const hour = row.timestamp.getHours();
        return hour >= 18 || hour < 7;
      });
      const rows = night.length ? night : recent;
      return rows.length
        ? rows.reduce((sum, row) => sum + row.loadPowerW, 0) / rows.length / 1000
        : (latest?.loadPowerW ?? 0) / 1000;
    })();

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(settings.latitude));
    weatherUrl.searchParams.set("longitude", String(settings.longitude));
    weatherUrl.searchParams.set("timezone", settings.timezone);
    weatherUrl.searchParams.set("forecast_days", "2");
    weatherUrl.searchParams.set("hourly", "shortwave_radiation,temperature_2m,cloud_cover");
    weatherUrl.searchParams.set("daily", "sunrise,sunset");

    const weatherResponse = await fetch(weatherUrl, { next: { revalidate: 1800 } });
    if (!weatherResponse.ok) {
      return NextResponse.json({ error: "forecast_unavailable" }, { status: 502 });
    }
    const weather = await weatherResponse.json();

    const now = new Date();
    const sunrise = weather.daily?.sunrise?.[1] ?? weather.daily?.sunrise?.[0];
    const sunset = weather.daily?.sunset?.[0];
    const nightEnd = sunrise ? new Date(sunrise).getTime() : now.getTime();
    const remainingNightHours = Math.max(0, (nightEnd - now.getTime()) / 3_600_000);

    const batterySoc = latest?.batterySoc ?? 0;
    const night = assessNightEndurance({
      batterySoc,
      batteryCapacityKWh: settings.batteryCapacityWh / 1000,
      averageNightLoadKW,
      remainingNightHours,
      reserveSoc: 20,
    });

    const panelKw = settings.panelPowerW / 1000;
    const hourly = (weather.hourly?.time ?? []).map((time: string, index: number) => ({
      time,
      solarKWh: Math.max(0, Number(weather.hourly.shortwave_radiation?.[index] ?? 0) / 1000 * panelKw * 0.82),
      loadKWh: averageNightLoadKW,
    }));
    const surplusWindows = findSurplusWindows(
      hourly,
      settings.batteryCapacityWh / 1000,
      batterySoc,
      100,
    );

    return NextResponse.json({
      source: "Open-Meteo + Shamsak telemetry",
      night,
      surplusWindows: surplusWindows.map((window) => ({
        ...window,
        surplusKWh: Number(window.surplusKWh.toFixed(2)),
      })),
      latestTelemetryAt: latest?.timestamp?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json({ error: "prediction_failed" }, { status: 503 });
  }
}
