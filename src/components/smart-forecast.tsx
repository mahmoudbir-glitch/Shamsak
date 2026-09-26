"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CloudSun, Loader2, RefreshCw, SunMedium } from "lucide-react";
import { useSmartEnergy } from "@/hooks/use-smart-energy";
import { calculateAutonomy, weatherLabel } from "@/lib/smart-forecast";

export function SmartForecast() {
  const { forecasts, weather, snapshot, loading, isRefreshing, error, refresh } = useSmartEnergy();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const current = weather?.current;

  useEffect(() => {
    if (!selectedDate && forecasts[0]) setSelectedDate(forecasts[0].date);
  }, [forecasts, selectedDate]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selected = useMemo(
    () => forecasts.find((day) => day.date === selectedDate) ?? forecasts[0],
    [forecasts, selectedDate],
  );

  const handleRefreshForecast = async () => {
    const success = await refresh();
    setToast(success ? "تم تحديث التوقعات بنجاح ☀️" : "تعذر التحديث، تم الاحتفاظ بآخر بيانات متاحة");
  };

  return (
    <section dir="rtl" className="relative space-y-5">
      {toast && (
        <div role="status" aria-live="polite" className={"fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm font-black shadow-xl " + (toast.startsWith("تم") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
          {toast}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🔮 توقعات الطاقة والبطارية</h1>
            <p className="mt-2 text-base font-semibold text-slate-500">توقع شمسي + بطارية + طقس + فائض من بيانات Open-Meteo</p>
          </div>
          <button type="button" onClick={() => void handleRefreshForecast()} disabled={loading || isRefreshing} aria-label="تحديث التوقعات" className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-base font-extrabold text-blue-700 transition active:scale-95 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
            {loading || isRefreshing ? <><Loader2 size={17} className="animate-spin" /> جاري التحديث...</> : <><RefreshCw size={17} /> تحديث</>}
          </button>
        </div>

        {current && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-sky-50 p-4">
              <span className="text-sm font-semibold text-slate-500">الطقس الآن</span>
              <strong className="mt-1 block text-xl font-extrabold text-slate-900">{weatherLabel(current.weather_code ?? 0)}</strong>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <span className="text-sm font-semibold text-slate-500">الحرارة</span>
              <strong className="mt-1 block text-xl font-extrabold text-amber-600">{Math.round(current.temperature_2m ?? 0)}°م</strong>
            </div>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-base font-semibold text-amber-800">{error}. تم الاحتفاظ بآخر توقعات ناجحة إن كانت متاحة.</p>}
      </div>

      {forecasts.length > 0 && (
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <div className="flex min-w-max gap-2">
            {forecasts.map((day) => (
              <button key={day.date} type="button" onClick={() => setSelectedDate(day.date)} className={"min-w-[92px] rounded-2xl border px-4 py-3 text-center transition active:scale-95 " + (selected?.date === day.date ? "border-blue-500 bg-blue-600 text-white shadow-md" : "border-slate-200 bg-white text-slate-700 shadow-sm")}>
                <span className="block text-sm font-black">{day.label}</span>
                <span className={"mt-1 block text-xs font-bold " + (selected?.date === day.date ? "text-blue-100" : "text-slate-400")}>{weatherLabel(day.weatherCode)}</span>
                <span className={"mt-1 block text-sm font-extrabold " + (selected?.date === day.date ? "text-white" : "text-slate-800")}>{Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && !forecasts.length ? (
        <div className="rounded-2xl bg-white p-6 text-center text-lg font-bold text-slate-500">جاري بناء التوقع الذكي…</div>
      ) : selected ? (
        <>
          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">ملخص {selected.label}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{weatherLabel(selected.weatherCode)} • {Math.round(selected.tempMin)}° — {Math.round(selected.tempMax)}°</p>
              </div>
              <div className="text-left">
                <span className="block text-sm font-semibold text-slate-500">توليد متوقع</span>
                <strong className="text-xl font-extrabold text-amber-600">{selected.productionKWh} ك.و.س</strong>
              </div>
            </div>

            <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100" title="توزيع التوليد المتوقع">
              <div className="bg-emerald-500 transition-all" style={{ width: selected.batteryPct + "%" }} />
              <div className="bg-blue-500 transition-all" style={{ width: selected.homePct + "%" }} />
              <div className="bg-amber-600 transition-all" style={{ width: selected.surplusPct + "%" }} />
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <BreakdownRow dot="bg-emerald-500" label="يشحن البطارية" kwh={selected.batteryKWh} pct={selected.batteryPct} />
              <BreakdownRow dot="bg-blue-500" label="يستهلكه البيت نهاراً" kwh={selected.homeKWh} pct={selected.homePct} />
              <BreakdownRow dot="bg-amber-600" label="فائض غير مستخدم" kwh={selected.surplusKWh} pct={selected.surplusPct} />
            </div>
          </article>

          {selected.batteryTiming && (
            <BatteryTimingCard timing={selected.batteryTiming} selected={selected} />
          )}

          {snapshot && selected.date === forecasts[0]?.date && (
            <NightAutonomyCard snapshot={snapshot} sunrise={selected.sunrise} sunset={selected.sunset} />
          )}
        </>
      ) : null}
    </section>
  );
}

function BreakdownRow({ dot, label, kwh, pct }: { dot: string; label: string; kwh: number; pct: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="flex items-center gap-2 font-semibold text-slate-600"><span className={"h-2.5 w-2.5 rounded-full " + dot} />{label}</span>
      <strong className="font-black text-slate-900">{kwh.toFixed(1)} ك.و.س • {pct}%</strong>
    </div>
  );
}

function BatteryTimingCard({ timing, selected }: { timing: NonNullable<import("@/lib/smart-forecast").DayForecast["batteryTiming"]>; selected: import("@/lib/smart-forecast").DayForecast }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">🔋 مواعيد شحن البطارية</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">تقدير مبني على الإشعاع المتوقع والحمل الحالي</p>
        </div>
        <SunMedium className="text-amber-500" size={24} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric title="اكتمال الشحن" value={timing.fullChargeTime ? "نحو " + timing.fullChargeTime : "لا يصل إلى 100%"} tone="amber" />
        <Metric title="عند الغروب" value={timing.sunsetSoc + "%"} tone="orange" />
        <Metric title="عند الشروق" value={timing.sunriseSoc + "%"} tone="emerald" />
        <Metric title="توليد اليوم" value={selected.productionKWh + " ك.و.س"} tone="blue" />
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500">هذه قراءة تنبؤية وليست ضماناً؛ تتغير مع السحب والمطر والاستهلاك الفعلي.</p>
    </article>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: "amber" | "orange" | "emerald" | "blue" }) {
  const cls = { amber: "bg-amber-50 text-amber-700", orange: "bg-orange-50 text-orange-700", emerald: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-700" }[tone];
  return <div className={"rounded-xl p-4 " + cls}><span className="block text-sm font-semibold opacity-80">{title}</span><strong className="mt-1 block text-xl font-black">{value}</strong></div>;
}

function NightAutonomyCard({ snapshot, sunrise, sunset }: { snapshot: { batterySoc: number; homePowerW: number }; sunrise?: string; sunset?: string }) {
  const [capacity, setCapacity] = useState(4800);
  useEffect(() => {
    const value = Number(localStorage.getItem("shamsak_battery_capacity") || 4800);
    if (Number.isFinite(value) && value > 0) setCapacity(value);
  }, []);
  const now = new Date();
  const sunsetDate = sunset ? new Date(sunset) : undefined;
  const sunriseDate = sunrise ? new Date(sunrise) : undefined;
  const nightStart = sunsetDate && sunsetDate > now ? sunsetDate : now;
  const hoursToSunrise = sunriseDate ? Math.max(0.5, (sunriseDate.getTime() - nightStart.getTime()) / 3600000) : 8;
  const result = calculateAutonomy(snapshot.batterySoc, capacity, snapshot.homePowerW, hoursToSunrise);
  const percent = Math.min(100, result.probability);

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">🌙 الصمود الليلي</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">تقدير حتى الشروق وفق الحمل الحالي وحد الأمان</p>
        </div>
        {result.sufficient ? <CheckCircle2 className="text-emerald-500" /> : <CloudSun className="text-amber-500" />}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric title="عند الشروق" value={result.expectedSocAtSunrise + "%"} tone="emerald" />
        <Metric title="احتمال الصمود" value={percent + "%"} tone="blue" />
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm font-bold text-slate-600"><span>هامش الصمود</span><span>{result.hoursCovered} ساعة تقريباً</span></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: percent + "%" }} /></div>
        <p className="mt-3 text-sm font-semibold text-slate-600">{result.sufficient ? "✓ الطاقة القابلة للاستخدام تكفي للوصول إلى الشروق وفق الفرضيات الحالية." : "⚠️ قد تحتاج المنظومة إلى الشبكة قبل الشروق وفق الاستهلاك الحالي."}</p>
      </div>
    </article>
  );
}
