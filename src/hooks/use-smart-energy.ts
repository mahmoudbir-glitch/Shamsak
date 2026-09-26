"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EnergySnapshot } from "@/lib/energy";
import { calculateBatteryTiming, estimateSolarKWh, splitEnergy, weatherConfidence, type DayForecast, type HourlySolarPoint } from "@/lib/smart-forecast";

type WeatherResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    cloud_cover?: number[];
    weather_code?: number[];
    shortwave_radiation?: number[];
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

function readNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function dayLabel(index: number) {
  return index === 0 ? "اليوم" : index === 1 ? "غداً" : index === 2 ? "بعد غد" : "اليوم التالي";
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
      const batteryCapacityWh = readNumber("shamsak_battery_capacity", 4800);

      const telemetryPromise = fetch("/api/telemetry", { cache: "no-store" });
      const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
      weatherUrl.searchParams.set("latitude", String(DEFAULT_LAT));
      weatherUrl.searchParams.set("longitude", String(DEFAULT_LON));
      weatherUrl.searchParams.set("timezone", DEFAULT_TIMEZONE);
      weatherUrl.searchParams.set("forecast_days", "4");
      weatherUrl.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day");
      weatherUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset");
      weatherUrl.searchParams.set("hourly", "temperature_2m,precipitation_probability,precipitation,cloud_cover,weather_code,shortwave_radiation");

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

      const currentLoadW = Math.max(0, nextSnapshot?.homePowerW ?? snapshotRef.current?.homePowerW ?? 1200);
      const dailyHomeKWh = (currentLoadW / 1000) * 24;
      const batterySoc = nextSnapshot?.batterySoc ?? snapshotRef.current?.batterySoc ?? 50;

      const nextForecasts = daily.time.slice(0, 4).map((date, dayIndex) => {
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
            surplusKWh: Math.max(0, solarKWh - currentLoadW / 1000),
          };
        });

        const productionKWh = points.reduce((sum, point) => sum + point.solarKWh, 0);
        const maxBatteryCharge = Math.max(0, (100 - batterySoc) / 100 * batteryCapacityWh / 1000);
        const homeKWh = Math.min(dailyHomeKWh, productionKWh);
        const split = splitEnergy(productionKWh, homeKWh, Math.min(maxBatteryCharge, productionKWh));
        const confidence = weatherConfidence(
          points.map((p) => p.weatherCode),
          points.map((p) => p.precipitationProbability),
        );

        return {
          date,
          label: dayLabel(dayIndex),
          weatherCode: daily.weather_code?.[dayIndex] ?? 0,
          tempMax: daily.temperature_2m_max?.[dayIndex] ?? 0,
          tempMin: daily.temperature_2m_min?.[dayIndex] ?? 0,
          sunrise: daily.sunrise?.[dayIndex] ?? "",
          sunset: daily.sunset?.[dayIndex] ?? "",
          productionKWh: Math.round(productionKWh * 10) / 10,
          batteryKWh: Math.round(split.battery * 10) / 10,
          homeKWh: Math.round(split.directHome * 10) / 10,
          batteryPct: split.batteryPct,
          homePct: split.homePct,
          surplusPct: split.surplusPct,
          surplusKWh: Math.round(split.surplus * 10) / 10,
          confidence,
          hourly: points,
          batteryTiming,
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
