export type HourlySolarPoint = {
  time: string;
  irradianceWm2: number;
  weatherCode: number;
  precipitationProbability: number;
  solarKWh: number;
  surplusKWh: number;
};

export type BatteryTiming = {
  sunriseSoc: number;
  sunsetSoc: number;
  fullChargeTime?: string;
  autonomyHours: number;
  autonomyProbability: number;
};

export type DayForecast = {
  date: string;
  label: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: string;
  sunset: string;
  productionKWh: number;
  batteryKWh: number;
  homeKWh: number;
  batteryPct: number;
  homePct: number;
  surplusPct: number;
  surplusKWh: number;
  confidence: "عالية" | "متوسطة" | "منخفضة";
  hourly: HourlySolarPoint[];
  batteryTiming?: BatteryTiming;
};

export type AutonomyResult = {
  expectedSocAtSunrise: number;
  hoursCovered: number;
  probability: number;
  sufficient: boolean;
};

export function weatherLabel(code: number) {
  if (code === 0) return "مشمس";
  if (code <= 3) return "غائم جزئياً";
  if (code <= 48) return "ضبابي";
  if (code <= 57) return "رذاذ";
  if (code <= 67) return "أمطار";
  if (code <= 77) return "ثلوج";
  if (code <= 82) return "زخات مطر";
  return "عواصف";
}

export function weatherConfidence(codes: number[], rainProbabilities: number[]) {
  const cloudy = codes.filter((code) => code >= 2).length / Math.max(codes.length, 1);
  const rain = rainProbabilities.reduce((sum, value) => sum + value, 0) / Math.max(rainProbabilities.length, 1);
  if (cloudy < 0.35 && rain < 25) return "عالية" as const;
  if (cloudy < 0.7 && rain < 60) return "متوسطة" as const;
  return "منخفضة" as const;
}

export function estimateSolarKWh(irradianceWm2: number, panelCapacityKw: number, performanceRatio = 0.78) {
  return Math.max(0, irradianceWm2 / 1000) * Math.max(0, panelCapacityKw) * performanceRatio;
}

export function calculateAutonomy(
  soc: number,
  batteryCapacityWh: number,
  loadW: number,
  hoursToSunrise: number,
  safetyReserve = 10,
): AutonomyResult {
  const safeSoc = Math.min(100, Math.max(0, soc));
  const safeCapacity = Math.max(1, batteryCapacityWh);
  const safeLoad = Math.max(0, loadW);
  const usableWh = Math.max(0, safeCapacity * (safeSoc - safetyReserve) / 100);
  const requiredWh = safeLoad * Math.max(0, hoursToSunrise);
  const hoursCovered = safeLoad > 0 ? usableWh / safeLoad : hoursToSunrise;
  const margin = requiredWh > 0 ? usableWh / requiredWh : 2;
  const probability = Math.round(Math.min(100, Math.max(0, margin * 100)));
  const expectedSocAtSunrise = safeLoad > 0
    ? Math.max(safetyReserve, Math.min(100, safeSoc - (requiredWh / safeCapacity) * 100))
    : safeSoc;
  return {
    expectedSocAtSunrise: Math.round(expectedSocAtSunrise),
    hoursCovered: Math.round(hoursCovered * 10) / 10,
    probability,
    sufficient: margin >= 1,
  };
}

export function splitEnergy(productionKWh: number, homeKWh: number, batteryChargeKWh: number) {
  const total = Math.max(productionKWh, 0);
  const directHome = Math.min(Math.max(homeKWh, 0), total);
  const remaining = Math.max(0, total - directHome);
  const battery = Math.min(remaining, Math.max(0, batteryChargeKWh));
  const surplus = Math.max(0, total - directHome - battery);
  const denominator = Math.max(total, 0.001);

  return {
    directHome,
    battery,
    surplus,
    batteryPct: Math.round((battery / denominator) * 100),
    homePct: Math.round((directHome / denominator) * 100),
    surplusPct: Math.round((surplus / denominator) * 100),
  };
}

export function formatForecastTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString("ar-LB", { hour: "2-digit", minute: "2-digit" });
}

export function calculateBatteryTiming(params: {
  soc: number;
  capacityWh: number;
  loadW: number;
  hourly: HourlySolarPoint[];
  sunrise?: string;
  sunset?: string;
  now?: Date;
  chargeEfficiency?: number;
  safetyReserve?: number;
}): BatteryTiming {
  const {
    soc,
    capacityWh,
    loadW,
    hourly,
    sunrise,
    sunset,
    now = new Date(),
    chargeEfficiency = 0.9,
    safetyReserve = 10,
  } = params;

  const safeCapacity = Math.max(1, capacityWh);
  const safeLoad = Math.max(0, loadW);
  const startSoc = Math.min(100, Math.max(0, soc));
  let currentSoc = startSoc;
  let fullChargeTime: string | undefined;

  for (const point of hourly) {
    const t = new Date(point.time);
    if (Number.isNaN(t.getTime()) || t < now) continue;
    const hourHome = safeLoad / 1000;
    const directHome = Math.min(point.solarKWh, hourHome);
    const chargeInput = Math.max(0, point.solarKWh - directHome);
    currentSoc = Math.min(100, currentSoc + (chargeInput * chargeEfficiency / (safeCapacity / 1000)) * 100);
    if (!fullChargeTime && currentSoc >= 99.5) {
      fullChargeTime = point.time;
      break;
    }
  }

  const sunsetDate = sunset ? new Date(sunset) : undefined;
  let sunsetSoc = startSoc;
  let afterSunset = false;
  for (const point of hourly) {
    const t = new Date(point.time);
    if (Number.isNaN(t.getTime()) || t < now) continue;
    if (sunsetDate && t > sunsetDate) break;
    const hourHome = safeLoad / 1000;
    const directHome = Math.min(point.solarKWh, hourHome);
    const chargeInput = Math.max(0, point.solarKWh - directHome);
    sunsetSoc = Math.min(100, sunsetSoc + (chargeInput * chargeEfficiency / (safeCapacity / 1000)) * 100);
    afterSunset = true;
  }
  if (!afterSunset) sunsetSoc = startSoc;

  const sunriseDate = sunrise ? new Date(sunrise) : undefined;
  const nightHours = sunriseDate ? Math.max(0, (sunriseDate.getTime() - now.getTime()) / 3_600_000) : 8;
  const autonomy = calculateAutonomy(sunsetSoc, safeCapacity, safeLoad, nightHours, safetyReserve);

  return {
    sunriseSoc: autonomy.expectedSocAtSunrise,
    sunsetSoc: Math.round(sunsetSoc),
    fullChargeTime: fullChargeTime ? formatForecastTime(fullChargeTime) : undefined,
    autonomyHours: autonomy.hoursCovered,
    autonomyProbability: autonomy.probability,
  };
}
