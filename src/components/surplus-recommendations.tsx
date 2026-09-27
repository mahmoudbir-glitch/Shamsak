"use client";

import { useState } from "react";
import { useSmartEnergy } from "@/hooks/use-smart-energy";

function formatHour(iso: string) {
  return new Intl.DateTimeFormat("ar-LB", { timeZone: "Asia/Beirut", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function SurplusRecommendations() {
  const { forecasts, loading } = useSmartEnergy();
  const [showRecommendations, setShowRecommendations] = useState(false);
  const points = forecasts[0]?.hourly ?? [];
  const windows: { start: string; end: string; kwh: number }[] = [];
  let current: { start: string; end: string; kwh: number } | null = null;

  points.forEach((point) => {
    if (point.surplusKWh >= 0.3) {
      if (!current) current = { start: point.time, end: point.time, kwh: 0 };
      current.end = point.time;
      current.kwh += point.surplusKWh;
    } else if (current) {
      windows.push(current);
      current = null;
    }
  });
  if (current) windows.push(current);

  const best = windows.sort((a, b) => b.kwh - a.kwh)[0];
  const recommendations = [
    "تشغيل الغسالة",
    "تشغيل مضخة المياه",
    "شحن السيارة الكهربائية",
    "تشغيل المكيف",
    "تشغيل سخان الماء",
  ];

  return (
    <section dir="rtl" className="energy-card p-5">
      <h2 className="text-lg font-black text-slate-950">⚡ إدارة الفائض والتوصيات الذكية</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">نحدد الساعات التي تتجاوز فيها الطاقة الشمسية الاستهلاك المتوقع.</p>
      {loading && <p className="mt-4 text-base font-bold text-slate-500">جاري تحليل ساعات الفائض…</p>}
      {!loading && best && (
        <>
          <div className="mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-sky-50 p-4">
            <span className="text-xs font-bold text-slate-500">☀️ الساعات الذهبية المتوقعة</span>
            <strong className="mt-1 block text-2xl font-black tracking-tight text-cyan-700">{formatHour(best.start)} — {formatHour(best.end)}</strong>
            <p className="mt-2 text-base font-semibold text-slate-600">فائض قابل للاستفادة: نحو {Math.round(best.kwh * 10) / 10} ك.و.س</p>
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <button
              type="button"
              onClick={() => setShowRecommendations((value) => !value)}
              aria-expanded={showRecommendations}
              className="flex w-full items-center justify-between gap-3 text-right"
            >
              <div>
                <strong className="block text-base font-extrabold text-emerald-800">
                  توصيات ذكية ({recommendations.length})
                </strong>
                <span className="mt-1 block text-sm font-semibold text-emerald-700">
                  اختر الأجهزة التي تريد تشغيلها خلال نافذة الفائض.
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-800 shadow-sm">
                {showRecommendations ? "إخفاء" : "عرض"}
              </span>
            </button>

            {showRecommendations && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((item) => (
                  <div key={item} className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
                    <strong className="text-base font-extrabold text-emerald-800">{item}</strong>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">يفضل تشغيله خلال نافذة الفائض.</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {!loading && !best && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">لا توجد نافذة فائض واضحة في التوقع الحالي.</div>
      )}
    </section>
  );
}
