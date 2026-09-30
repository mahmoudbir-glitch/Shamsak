"use client";

import { useState } from "react";
import { useSmartEnergy } from "@/hooks/use-smart-energy";

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
    {
      id: 1,
      title: "تشغيل الغسالة",
      icon: "🧺",
      detail: "مناسب خلال ساعات الفائض لتقليل الاعتماد على الشبكة.",
    },
    {
      id: 2,
      title: "تشغيل مضخة المياه",
      icon: "💧",
      detail: "يفضل تشغيلها عندما يكون الإنتاج الشمسي مرتفعاً.",
    },
    {
      id: 3,
      title: "شحن السيارة الكهربائية",
      icon: "🚗",
      detail: "استفد من الطاقة الشمسية المتاحة قبل السحب من الشبكة.",
    },
    ...(best && best.kwh >= 1
      ? [{
          id: 4,
          title: "تشغيل المكيف",
          icon: "❄️",
          detail: "يفضل تشغيله خلال نافذة الفائض.",
        }]
      : []),
    ...(best && best.kwh >= 1.5
      ? [{
          id: 5,
          title: "تشغيل سخان الماء",
          icon: "♨️",
          detail: "يفضل تشغيله خلال نافذة الفائض.",
        }]
      : []),
  ];

  return (
    <section dir="rtl" className="energy-card overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
            <span>⚡</span>
            <span>إدارة الطاقة</span>
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">
            إدارة الفائض والتوصيات الذكية
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            نحدد الساعات التي تتجاوز فيها الطاقة الشمسية الاستهلاك المتوقع، ثم نقترح أفضل استخدام للفائض.
          </p>
        </div>
        {best && (
          <div className="hidden shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-center text-white sm:block">
            <span className="block text-[10px] font-bold text-slate-300">الفائض المتوقع</span>
            <strong className="mt-1 block text-lg font-black">{Math.round(best.kwh * 10) / 10} ك.و.س</strong>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-base font-bold text-slate-500">
          جاري تحليل ساعات الفائض…
        </div>
      )}

      {!loading && best && (
        <>
          <div className="mt-5 rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold text-slate-500">☀️ أفضل نافذة للاستفادة من الشمس</span>
                <strong className="mt-2 block text-2xl font-black tracking-tight text-cyan-700 sm:text-3xl">
                  {formatHour(best.start)} — {formatHour(addHour(best.end))}
                </strong>
              </div>
              <div className="rounded-2xl bg-white/90 px-4 py-3 text-right shadow-sm ring-1 ring-cyan-100">
                <span className="block text-xs font-bold text-slate-500">قابل للاستخدام</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">
                  نحو {Math.round(best.kwh * 10) / 10} ك.و.س
                </strong>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
              <div className="h-full w-3/4 rounded-full bg-cyan-500" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              هذه الفترة هي الأنسب لتشغيل الأجهزة ذات الاستهلاك المرتفع والاستفادة من التوليد الشمسي مباشرة.
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !best && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          <span className="text-lg">☁️</span>
          <span>لا توجد نافذة فائض واضحة في التوقع الحالي.</span>
        </div>
      )}
    </section>
  );
}
