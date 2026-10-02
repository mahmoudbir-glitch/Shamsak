"use client";

import { useState } from "react";
import { useSharedSmartEnergy } from "@/components/smart-energy-provider";
import { AmpPill } from "@/components/amp-pill";
import { acAmpHours } from "@/lib/energy";

function formatHour(iso: string) {
  return new Intl.DateTimeFormat("ar-LB-u-nu-latn", {
    timeZone: "Asia/Beirut",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function addHour(iso: string) {
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString();
}

export function SurplusRecommendations() {
  const { forecasts, loading } = useSharedSmartEnergy();
  const [showRecommendations, setShowRecommendations] = useState(false);
  type Window = { start: string; end: string; kwh: number };
  const bestWindow = (dayIndex: number): Window | undefined => {
    const windows: Window[] = [];
    let current: Window | null = null;
    for (const point of forecasts[dayIndex]?.hourly ?? []) {
      if (point.surplusKWh >= 0.3) {
        if (!current) current = { start: point.time, end: point.time, kwh: 0 };
        current.end = point.time;
        current.kwh += point.surplusKWh;
      } else if (current) {
        windows.push(current);
        current = null;
      }
    }
    if (current) windows.push(current);
    return windows.sort((a, b) => b.kwh - a.kwh)[0];
  };

  // Today's remaining hours first; once today has no surplus left (evening,
  // or the battery still absorbs everything), look ahead to tomorrow.
  const todayBest = bestWindow(0);
  const tomorrowBest = todayBest ? undefined : bestWindow(1);
  const best = todayBest ?? tomorrowBest;
  const dayWord = todayBest ? "اليوم" : "غدًا";
  const todayLeftKWh = (forecasts[0]?.hourly ?? []).reduce((sum, point) => sum + point.surplusKWh, 0);

  // Typical household loads with a rough energy cost, so each tip says
  // whether today's surplus actually covers it.
  const surplus = best?.kwh ?? 0;
  const loads = [
    { id: 1, title: "تشغيل الغسالة", icon: "🧺", kwh: 0.8, detail: "دورة غسيل كاملة تستهلك نحو 0.8 kWh." },
    { id: 2, title: "تشغيل مضخة المياه", icon: "💧", kwh: 0.75, detail: "ساعة تشغيل لمضخة منزلية نحو 0.75 kWh." },
    { id: 3, title: "الكوي", icon: "👕", kwh: 1, detail: "ساعة كوي تستهلك نحو 1 kWh." },
    { id: 4, title: "تشغيل المكيف", icon: "❄️", kwh: 1.2, detail: "ساعة تبريد لغرفة واحدة نحو 1.2 kWh." },
    { id: 5, title: "تشغيل سخان الماء", icon: "♨️", kwh: 2, detail: "ساعة تسخين نحو 2 kWh." },
  ];
  const recommendations = loads
    .filter((load) => load.kwh <= surplus)
    .map((load) => ({ id: load.id, kwh: load.kwh, title: load.title, icon: load.icon, detail: load.detail + ` الفائض المتوقع ${dayWord} يغطيها.` }));

  return (
    <section dir="rtl" className="energy-card overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl ring-1 ring-amber-200/70" aria-hidden="true">⚡</span>
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-tight text-slate-950">أفضل وقت لاستخدام الشمس</h2>
            <p className="text-xs font-semibold text-slate-500">ساعات الفائض وما يمكن تشغيله فيها.</p>
          </div>
        </div>
        {best && (
          <div className="hidden shrink-0 rounded-2xl bg-amber-50 px-3 py-2 text-center text-amber-800 ring-1 ring-amber-100 sm:block">
            <span className="block text-[10px] font-bold text-amber-600">الفائض المتوقع</span>
            <strong className="mt-1 block text-lg font-black"><bdi dir="ltr">{Math.round(best.kwh * 10) / 10} kWh</bdi></strong>
            <span className="mt-1.5 block"><AmpPill tone="amber" unit="Ah" amps={acAmpHours(best.kwh)} /></span>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-base font-bold text-slate-500">
          جاري تحليل ساعات الفائض…
        </div>
      )}

      {!loading && best && (
        <>
          <div className="mt-4 rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500">
                  ☀️ النافذة الأفضل
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">{dayWord}</span>
                </span>
                <strong className="mt-2 block text-2xl font-black tracking-tight text-amber-700 sm:text-3xl">
                  {formatHour(best.start)} — {formatHour(addHour(best.end))}
                </strong>
              </div>
              <div className="rounded-2xl bg-white/90 px-4 py-3 text-right shadow-sm ring-1 ring-amber-100">
                <span className="block text-xs font-bold text-slate-500">قابل للاستخدام</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">
                  نحو <bdi dir="ltr">{Math.round(best.kwh * 10) / 10} kWh</bdi>
                </strong>
                <span className="mt-1.5 block"><AmpPill tone="amber" unit="Ah" amps={acAmpHours(best.kwh)} /></span>
              </div>
            </div>
            {!todayBest && (
              <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-bold leading-5 text-slate-500">
                لا فائض متبقٍ اليوم{todayLeftKWh < 0.3 ? ": ما تبقّى من الشمس يذهب للمنزل وشحن البطارية" : ""}. هذه نافذة الغد.
              </p>
            )}
          </div>

          {recommendations.length > 0 && <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setShowRecommendations((value) => !value)}
              aria-expanded={showRecommendations}
              className="flex w-full items-center justify-between gap-3 text-right"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">💡</span>
                <div>
                  <strong className="block text-base font-extrabold text-emerald-900">
                    توصيات ذكية ({recommendations.length})
                  </strong>
                  <span className="mt-1 block text-sm font-semibold text-emerald-700">
                    أفكار عملية لاستخدام الفائض بدلاً من هدره.
                  </span>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-emerald-800 shadow-sm">
                {showRecommendations ? "إخفاء" : "عرض"}
              </span>
            </button>

            {showRecommendations && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <strong className="block text-sm font-extrabold text-slate-900">
                          {item.title}
                        </strong>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          {item.detail}
                        </p>
                        <span className="mt-2 block"><AmpPill tone="emerald" unit="Ah" amps={acAmpHours(item.kwh)} /></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>}
        </>
      )}

      {!loading && !best && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          <span className="text-lg">☁️</span>
          <span className="leading-6">لا يُتوقع فائض اليوم ولا غدًا: كل إنتاج الألواح يذهب لاستهلاك المنزل وشحن البطارية. هذا طبيعي في الأيام الغائمة أو عندما يكون الاستهلاك مرتفعًا.</span>
        </div>
      )}
    </section>
  );
}
