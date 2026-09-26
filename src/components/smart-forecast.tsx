"use client";

import { useSmartEnergy } from "@/hooks/use-smart-energy";
import { calculateAutonomy, weatherLabel } from "@/lib/smart-forecast";

export function SmartForecast() {
  const { forecasts, weather, snapshot, loading, error, refresh } = useSmartEnergy();
  const current = weather?.current;

  return (
    <section dir="rtl" className="space-y-5">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🔮 التنبؤ الذكي بالطاقة</h1>
            <p className="mt-2 text-base font-semibold text-slate-500">توقع شمسي + بطارية + طقس + فائض</p>
          </div>
          <button onClick={() => void refresh()} className="rounded-xl bg-blue-50 px-4 py-3 text-base font-extrabold text-blue-700">تحديث</button>
        </div>
        {current && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-sky-50 p-4">
              <span className="text-base font-semibold text-slate-500">الطقس الآن</span>
              <strong className="mt-1 block text-xl font-extrabold text-slate-900">{weatherLabel(current.weather_code ?? 0)}</strong>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <span className="text-base font-semibold text-slate-500">الحرارة</span>
              <strong className="mt-1 block text-xl font-extrabold text-amber-600">{Math.round(current.temperature_2m ?? 0)}°م</strong>
            </div>
          </div>
        )}
        {error && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-base font-semibold text-amber-800">{error}</p>}
      </div>

      {loading && !forecasts.length ? (
        <div className="rounded-2xl bg-white p-6 text-center text-lg font-bold text-slate-500">جاري بناء التوقع الذكي…</div>
      ) : forecasts.map((day) => (
        <article key={day.date} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">{day.label}</h2>
              <p className="mt-1 text-base font-semibold text-slate-500">{weatherLabel(day.weatherCode)} • {Math.round(day.tempMin)}° — {Math.round(day.tempMax)}°</p>
            </div>
            <div className="text-left">
              <span className="block text-base font-semibold text-slate-500">توليد متوقع</span>
              <strong className="text-xl font-extrabold text-amber-600">نحو {day.productionKWh} ك.و.س</strong>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {[
              ["شحن البطارية", day.batteryPct, "bg-emerald-500"],
              ["الاستهلاك المنزلي", day.homePct, "bg-blue-500"],
              ["الفائض", day.surplusPct, "bg-amber-500"],
            ].map(([label, value, color]) => (
              <div key={String(label)}>
                <div className="mb-1 flex justify-between text-base font-semibold text-slate-600">
                  <span>{label}</span><strong className="text-lg font-extrabold">{String(value)}%</strong>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={String(color) + " h-full rounded-full transition-all"} style={{ width: String(Math.max(0, Math.min(100, Number(value)))) + "%" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-amber-50 p-4">
              <span className="text-base font-semibold text-slate-500">الفائض المتوقع</span>
              <strong className="mt-1 block text-xl font-extrabold text-amber-700">{day.surplusKWh} ك.و.س</strong>
            </div>
            <div className="rounded-xl bg-sky-50 p-4">
              <span className="text-base font-semibold text-slate-500">ثقة الإشعاع</span>
              <strong className="mt-1 block text-xl font-extrabold text-sky-700">ثقة {day.confidence}</strong>
            </div>
          </div>
        </article>
      ))}

      {snapshot && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">🔋 صمود البطارية ليلاً</h2>
          <NightAutonomyCard snapshot={snapshot} sunrise={forecasts[0]?.sunrise} />
        </div>
      )}
    </section>
  );
}

function NightAutonomyCard({ snapshot, sunrise }: { snapshot: { batterySoc: number; homePowerW: number }; sunrise?: string }) {
  const batteryCapacity = typeof window !== "undefined" ? Number(localStorage.getItem("shamsak_battery_capacity") || 4800) : 4800;
  const hours = sunrise ? Math.max(0.5, (new Date(sunrise).getTime() - Date.now()) / 3600000) : 8;
  const result = calculateAutonomy(snapshot.batterySoc, batteryCapacity, snapshot.homePowerW, hours);
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-emerald-50 p-4">
        <span className="text-base font-semibold text-slate-500">عند الشروق</span>
        <strong className="mt-1 block text-2xl font-black text-emerald-700">نحو {result.expectedSocAtSunrise}%</strong>
      </div>
      <div className="rounded-xl bg-blue-50 p-4">
        <span className="text-base font-semibold text-slate-500">احتمال الصمود</span>
        <strong className="mt-1 block text-2xl font-black text-blue-700">{result.probability}%</strong>
      </div>
      <div className="col-span-2 rounded-xl bg-slate-50 p-4 text-base font-semibold text-slate-600">
        {result.sufficient ? "✓ وفق الاستهلاك الحالي، الطاقة القابلة للاستخدام تكفي للوصول إلى الشروق." : "⚠️ وفق الاستهلاك الحالي، قد تحتاج المنظومة إلى الشبكة قبل الشروق."}
        <span className="block mt-1 text-sm font-medium">التغطية المقدرة: نحو {result.hoursCovered} ساعة • الحساب تقديري ويتحدث مع البيانات الحية.</span>
      </div>
    </div>
  );
}
