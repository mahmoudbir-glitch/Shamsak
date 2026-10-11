import type { EnergySnapshot } from "@/lib/energy";

export type EnergyForecastContext = {
  recentAverageHomePowerW?: number | null;
  recentAverageSolarPowerW?: number | null;
  batterySocDropPerHour?: number | null;
};

export type EnergyForecastPoint = {
  minutesAhead: number;
  expectedHomePowerW: number;
  expectedSolarPowerW: number;
  expectedBatterySocPct: number | null;
};

export type EnergyForecast = {
  confidence: "low" | "medium";
  summary: string;
  points: EnergyForecastPoint[];
};

const finite = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Produces a conservative short-term forecast from the current reading and
 * recent averages. It deliberately does not invent a weather or time-of-day
 * model; when history is missing, confidence is low and the current values
 * are carried forward.
 */
export function forecastEnergy(
  snapshot: EnergySnapshot,
  context?: EnergyForecastContext,
): EnergyForecast {
  if (snapshot.stale) {
    return {
      confidence: "low",
      summary: "لا توجد بيانات حية كافية لبناء توقع موثوق.",
      points: [],
    };
  }

  const currentHome = Math.max(0, finite(snapshot.homePowerW) ?? 0);
  const currentSolar = Math.max(0, finite(snapshot.solarPowerW) ?? 0);
  const currentSoc = finite(snapshot.batterySoc);
  const averageHome = finite(context?.recentAverageHomePowerW);
  const averageSolar = finite(context?.recentAverageSolarPowerW);
  const dropPerHour = finite(context?.batterySocDropPerHour);

  const homeBaseline = averageHome !== null && averageHome >= 0 ? averageHome : currentHome;
  const solarBaseline = averageSolar !== null && averageSolar >= 0 ? averageSolar : currentSolar;
  const confidence = averageHome !== null || averageSolar !== null ? "medium" : "low";
  const points: EnergyForecastPoint[] = [];

  for (const minutesAhead of [30, 60, 120]) {
    const expectedHomePowerW = Math.round(currentHome * 0.5 + homeBaseline * 0.5);
    const expectedSolarPowerW = Math.round(currentSolar * 0.5 + solarBaseline * 0.5);
    const expectedBatterySocPct =
      currentSoc !== null && dropPerHour !== null && dropPerHour >= 0
        ? clamp(currentSoc - dropPerHour * (minutesAhead / 60), 0, 100)
        : currentSoc;

    points.push({
      minutesAhead,
      expectedHomePowerW,
      expectedSolarPowerW,
      expectedBatterySocPct:
        expectedBatterySocPct === null ? null : Math.round(expectedBatterySocPct * 10) / 10,
    });
  }

  const oneHour = points[1];
  const batteryText =
    oneHour.expectedBatterySocPct === null
      ? "لا يمكن تقدير نسبة البطارية بعد ساعة لعدم توفر اتجاه هبوط موثوق."
      : `التقدير بعد ساعة للبطارية نحو ${Math.round(oneHour.expectedBatterySocPct)}٪ إذا استمر معدل الهبوط الحالي.`;

  return {
    confidence,
    summary: `التوقع القصير مبني على القراءة الحالية ومتوسط القراءات الأخيرة. ${batteryText}`,
    points,
  };
}
