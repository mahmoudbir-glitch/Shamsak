"use client";

import { useSmartEnergy } from "@/hooks/use-smart-energy";

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  minSurplusKwh: number;
}

const recommendationsList: RecommendationItem[] = [
  {
    id: "washing_machine",
    title: "تشغيل الغسالة",
    description: "يفضل تشغيله خلال نافذة الفائض.",
    minSurplusKwh: 0.5,
  },
  {
    id: "water_pump",
    title: "تشغيل مضخة المياه",
    description: "يفضل تشغيله خلال نافذة الفائض.",
    minSurplusKwh: 0.8,
  },
  {
    id: "water_heater",
    title: "تشغيل سخان الماء",
    description: "يفضل تشغيله خلال نافذة الفائض.",
    minSurplusKwh: 1.5,
  },
  {
    id: "air_conditioner",
    title: "تشغيل المكيف",
    description: "يفضل تشغيله خلال نافذة الفائض.",
    minSurplusKwh: 1.0,
  },
  {
    id: "ev_charger",
    title: "شحن السيارة الكهربائية",
    description: "يفضل تشغيله خلال نافذة الفائض.",
    minSurplusKwh: 3.0,
  },
];

function formatHour(iso: string) {
  return new Intl.DateTimeFormat("ar-LB", {
    timeZone: "Asia/Beirut",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SurplusRecommendations() {
  const { forecasts, loading } = useSmartEnergy();
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

  return (
    <section dir="rtl" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">⚡ إدارة الفائض والتوصيات الذكية</h2>
      <p className="mt-2 text-base font-semibold text-slate-500">نحدد الساعات التي تتجاوز فيها الطاقة الشمسية الاستهلاك المتوقع.</p>

      {loading && <p className="mt-4 text-base font-bold text-slate-500">جاري تحليل ساعات الفائض…</p>}

      {!loading && best && (
        <>
          <div className="mt-5 rounded-2xl bg-amber-50 p-5">
            <span className="text-base font-semibold text-slate-600">☀️ الساعات الذهبية المتوقعة</span>
            <strong className="mt-1 block text-2xl font-black text-amber-700">{formatHour(best.start)} — {formatHour(best.end)}</strong>
            <p className="mt-2 text-base font-semibold text-slate-600">فائض قابل للاستفادة: نحو {Math.round(best.kwh * 10) / 10} ك.و.س</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {recommendationsList
              .filter((item) => best.kwh >= item.minSurplusKwh)
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 transition-all"
                >
                  <h4 className="mb-1 text-base font-bold text-emerald-900">{item.title}</h4>
                  <p className="text-xs text-emerald-700/80">{item.description}</p>
                </div>
              ))}
          </div>
        </>
      )}

      {!loading && !best && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-base font-semibold text-slate-600">
          لا توجد نافذة فائض واضحة في التوقع الحالي.
        </div>
      )}
    </section>
  );
}
