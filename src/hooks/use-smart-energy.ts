"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EnergySnapshot } from "@/lib/energy";
import { estimateSolarKWh, weatherConfidence, type DayForecast, type HourlySolarPoint } from "@/lib/smart-forecast";

type WeatherResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    cloud_cover?: number[];
    weather_code?: number[];
    shortwave_radiation?: number[];
    direct_radiation?: number[];
    diffuse_radiation?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
};

const DEFAULT_LAT = 33.8938;
const DEFAULT_LON = 35.5018;
const DEFAULT_TIMEZONE = "Asia/Beirut";
const SAFETY_RESERVE = 10;

function readNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function dayLabel(index: number, date: string) {
  if (index === 0) return "اليوم";
  if (index === 1) return "غداً";
  if (index === 2) return "بعد غد";
  return new Intl.DateTimeFormat("ar-LB", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(date + "T12:00:00"));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useSmartEnergy() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const snapshotRef = useRef<EnergySnapshot | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [forecasts, setForecasts] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh" = "refresh"): Promise<boolean> => {
    if (mode === "initial") setLoading(true);
    else setIsRefreshing(true);

    try {
      const panelCapacityKw = readNumber("shamsak_panel_capacity", 6);
      const latitude = readNumber("shamsak_latitude", DEFAULT_LAT);
      const longitude = readNumber("shamsak_longitude", DEFAULT_LON);
      const batteryCapacityWh = readNumber("shamsak_battery_capacity", 4800);

      const telemetryPromise = fetch("/api/telemetry", { cache: "no-store" });
      const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
      weatherUrl.searchParams.set("latitude", String(latitude));
      weatherUrl.searchParams.set("longitude", String(longitude));
      weatherUrl.searchParams.set("timezone", DEFAULT_TIMEZONE);
      weatherUrl.searchParams.set("forecast_days", "7");
      weatherUrl.searchParams.set(
        "current",
        "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day",
      );
      weatherUrl.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
      );
      weatherUrl.searchParams.set(
        "hourly",
        "temperature_2m,precipitation_probability,precipitation,cloud_cover,weather_code,shortwave_radiation,direct_radiation,diffuse_radiation",
      );

      const [telemetryResponse, weatherResponse] = await Promise.all([
        telemetryPromise,
        fetch(weatherUrl.toString(), { cache: "no-store" }),
      ]);

      let nextSnapshot: EnergySnapshot | null = snapshotRef.current;
      if (telemetryResponse.ok) {
        const data = (await telemetryResponse.json()) as EnergySnapshot;
        if (data.source === "live") nextSnapshot = data;
      }

      if (!weatherResponse.ok) throw new Error("weather_unavailable");

      const nextWeather = (await weatherResponse.json()) as WeatherResponse;
      const hourly = nextWeather.hourly;
      const daily = nextWeather.daily;

      if (!hourly?.time?.length || !daily?.time?.length) {
        throw new Error("forecast_empty");
      }

      const currentLoadW = Math.max(0, nextSnapshot?.homePowerW ?? snapshotRef.current?.homePowerW ?? 0);
      const initialSoc = clamp(nextSnapshot?.batterySoc ?? snapshotRef.current?.batterySoc ?? 50, 0, 100);
      let modeledBatteryWh = batteryCapacityWh * initialSoc / 100;

      const nextForecasts = daily.time.slice(0, 7).map((date, dayIndex) => {
        const indexes = hourly.time!.map((time, i) => ({ time, i })).filter(({ time }) => time.startsWith(date));
        const points: HourlySolarPoint[] = indexes.map(({ time, i }) => {
          const irradiance = hourly.shortwave_radiation?.[i] ?? 0;
          const solarKWh = estimateSolarKWh(irradiance, panelCapacityKw);
          return {
            time,
            irradianceWm2: irradiance,
            weatherCode: hourly.weather_code?.[i] ?? 0,
            precipitationProbability: hourly.precipitation_probability?.[i] ?? 0,
            solarKWh,
            surplusKWh: 0,
            directRadiationWm2: hourly.direct_radiation?.[i] ?? 0,
            diffuseRadiationWm2: hourly.diffuse_radiation?.[i] ?? 0,
          };
        });

        let directHomeKWh = 0;
        let batteryChargeKWh = 0;
        let surplusKWh = 0;
        let dayStartSoc = modeledBatteryWh / batteryCapacityWh * 100;
        let sunsetSoc = dayStartSoc;
        let sunriseSoc = dayStartSoc;
        let fullChargeTime: string | null = null;
        const sunrise = daily.sunrise?.[dayIndex] ?? "";
        const sunset = daily.sunset?.[dayIndex] ?? "";

        for (const point of points) {
          const homeKWh = currentLoadW / 1000;
          const directHome = Math.min(homeKWh, point.solarKWh);
          const netSolarAfterHome = Math.max(0, point.solarKWh - directHome);
          const batteryCanTake = Math.max(0, batteryCapacityWh - modeledBatteryWh) / 1000;
          const charge = Math.min(netSolarAfterHome, batteryCanTake);
          const remaining = Math.max(0, netSolarAfterHome - charge);

          directHomeKWh += directHome;
          batteryChargeKWh += charge;
          surplusKWh += remaining;
          point.surplusKWh = Math.round(remaining * 100) / 100;

          if (point.solarKWh < homeKWh) {
            const deficitWh = (homeKWh - point.solarKWh) * 1000;
            const usableWh = Math.max(0, modeledBatteryWh - batteryCapacityWh * SAFETY_RESERVE / 100);
            modeledBatteryWh -= Math.min(deficitWh, usableWh);
          }

          modeledBatteryWh = clamp(modeledBatteryWh + charge * 1000, batteryCapacityWh * SAFETY_RESERVE / 100, batteryCapacityWh);

          if (sunrise && point.time >= sunrise && sunriseSoc === dayStartSoc) {
            sunriseSoc = modeledBatteryWh / batteryCapacityWh * 100;
          }
          if (sunset && point.time <= sunset) {
            sunsetSoc = modeledBatteryWh / batteryCapacityWh * 100;
          }
          if (!fullChargeTime && modeledBatteryWh >= batteryCapacityWh * 0.995 && point.time <= sunset) {
            fullChargeTime = point.time;
          }
        }

        if (sunrise && points[0]?.time >= sunrise) {
          sunriseSoc = dayStartSoc;
        }

        const total = Math.max(0.001, directHomeKWh + batteryChargeKWh + surplusKWh);
        const batteryPct = Math.round(batteryChargeKWh / total * 100);
        const homePct = Math.round(directHomeKWh / total * 100);
        const surplusPct = Math.max(0, 100 - batteryPct - homePct);
        const confidence = weatherConfidence(
          points.map((p) => p.weatherCode),
          points.map((p) => p.precipitationProbability),
        );

        return {
          date,
          label: dayLabel(dayIndex, date),
          weatherCode: daily.weather_code?.[dayIndex] ?? 0,
          tempMax: daily.temperature_2m_max?.[dayIndex] ?? 0,
          tempMin: daily.temperature_2m_min?.[dayIndex] ?? 0,
          sunrise,
          sunset,
          productionKWh: Math.round(points.reduce((sum, point) => sum + point.solarKWh, 0) * 10) / 10,
          batteryPct,
          homePct,
          surplusPct,
          batteryKWh: Math.round(batteryChargeKWh * 10) / 10,
          homeKWh: Math.round(directHomeKWh * 10) / 10,
          surplusKWh: Math.round(surplusKWh * 10) / 10,
          confidence,
          hourly: points,
          chargeAtSunsetPct: Math.round(clamp(sunsetSoc, 0, 100)),
          chargeAtSunrisePct: Math.round(clamp(sunriseSoc, 0, 100)),
          fullChargeTime,
        };
      });

      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      setWeather(nextWeather);
      setForecasts(nextForecasts);
      setError(null);
      return true;
    } catch {
      setError("تعذر تحديث بيانات الطقس والتنبؤ");
      return false;
    } finally {
      if (mode === "initial") setLoading(false);
      else setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load("initial");
    const timer = window.setInterval(() => void load("refresh"), 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  return {
    snapshot,
    weather,
    forecasts,
    loading,
    isRefreshing,
    error,
    refresh: () => load("refresh"),
  };
}
