"use client";

import { useEffect, useState } from "react";

type Weather = {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: { sunrise?: string[]; sunset?: string[] };
};

const LATITUDE = 33.8938;
const LONGITUDE = 35.5018;

function interpretWeatherCode(code: number): string {
  if (code === 0) return "مشمس صافٍ";
  if (code <= 3) return "غائم جزئيًا";
  if (code <= 67) return "رذاذ أو أمطار خفيفة";
  if (code <= 86) return "ثلوج محتملة";
  return "أمطار وعواصف";
}

function formatTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-LB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function EnergyPage() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchWeather() {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(LATITUDE));
        url.searchParams.set("longitude", String(LONGITUDE));
        url.searchParams.set("current", "temperature_2m,weather_code");
        url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset");
        url.searchParams.set("timezone", "Asia/Beirut");

        const response = await fetch(url.toString(), { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Weather request failed: " + response.status);

        const result = (await response.json()) as Weather;
        setWeather(result);
        setWeatherError(false);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("فشل جلب بيانات الطقس:", error);
          setWeatherError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchWeather();
    return () => controller.abort();
  }, []);

  const temperature = weather?.current?.temperature_2m;
  const status = weather?.current?.weather_code == null ? null : interpretWeatherCode(weather.current.weather_code);

  return (
    <div className="min-h-screen bg-slate-50 p-3 pb-28 text-right sm:p-6" dir="rtl">
      <header className="mb-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-amber-600">الطاقة والتوقعات</h1>
          <p className="mt-1 text-xs text-slate-400">توقعات الطقس من Open-Meteo</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
          {loading ? "جارٍ التحديث" : weatherError ? "غير متاح" : "حي"}
        </span>
      </header>

      <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" aria-label="الطقس الحالي">
        {weatherError ? (
          <p className="font-bold text-slate-600">لا تتوفر بيانات الطقس حاليًا.</p>
        ) : loading ? (
          <p className="animate-pulse font-bold text-slate-500">جارٍ تحميل بيانات الطقس…</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-400">بيروت الآن</span>
              <p className="mt-1 text-lg font-black text-slate-800">{status ?? "—"}</p>
            </div>
            <span className="text-3xl font-black text-amber-500">
              {typeof temperature === "number" ? Math.round(temperature) + "°م" : "—"}
            </span>
          </div>
        )}
      </section>

      <section className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-400">الشروق</span>
          <p className="mt-2 font-black text-slate-800">{formatTime(weather?.daily?.sunrise?.[0])}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-400">الغروب</span>
          <p className="mt-2 font-black text-slate-800">{formatTime(weather?.daily?.sunset?.[0])}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-black text-slate-700">توقعات التوليد</h2>
        <p className="text-sm leading-7 text-slate-500">
          سيتم حساب توقع إنتاج الشمس والفائض من بيانات النظام والطقس المتاح. لا يتم عرض أرقام تقديرية على أنها بيانات حقيقية.
        </p>
      </section>
    </div>
  );
}
