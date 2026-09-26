export type HourlySolarPoint = {
  time: string;
  irradianceWm2: number;
  weatherCode: number;
  precipitationProbability: number;
  solarKWh: number;
  surplusKWh: number;
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
  batteryPct: number;
  homePct: number;
  surplusPct: number;
  surplusKWh: number;
  confidence: "عالية" | "متوسطة" | "منخفضة";
  hourly: HourlySolarPoint[];
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
  return { expectedSocAtSunrise: Math.round(expectedSocAtSunrise), hoursCovered: Math.round(hoursCovered * 10) / 10, probability, sufficient: margin >= 1 };
}

export function splitEnergy(productionKWh: number, homeKWh: number, batteryChargeKWh: number) {
  const directHome = Math.min(homeKWh, Math.max(0, productionKWh - batteryChargeKWh));
  const remaining = Math.max(0, productionKWh - directHome);
  const battery = Math.min(remaining, Math.max(0, batteryChargeKWh));
  const surplus = Math.max(0, productionKWh - directHome - battery);
  const total = Math.max(productionKWh, 0.001);
  return {
    directHome, battery, surplus,
    batteryPct: Math.round((battery / total) * 100),
    homePct: Math.round((directHome / total) * 100),
    surplusPct: Math.round((surplus / total) * 100),
  };
}
