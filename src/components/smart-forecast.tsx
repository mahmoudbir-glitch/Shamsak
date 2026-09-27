"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, BatteryCharging, CheckCircle2, Clock3, CloudSun, Loader2, MoonStar, RefreshCw, SunMedium, Zap } from "lucide-react";
import { useSmartEnergy } from "@/hooks/use-smart-energy";
import { calculateAutonomy, weatherIcon, weatherLabel, type DayForecast, type LoadStability } from "@/lib/smart-forecast";
import { InfoTip } from "@/components/info-tip";

function formatHour(iso?: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-LB", {
    timeZone: "Asia/Beirut",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ar-LB", {
    timeZone: "Asia/Beirut",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso + "T12:00:00"));
}

function addHour(iso: string) {
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString();
}

function findSurplusWindow(day?: DayForecast) {
  if (!day) return null;
  const points = day.hourly.filter((point) => point.surplusKWh >= 0.3);
  if (!points.length) return null;
  const durationHours = points.length;
  const totalKWh = points.reduce((sum, point) => sum + point.surplusKWh, 0);
  const peakKw = Math.max(...points.map((point) => point.surplusKWh));
  return {
    start: points[0].time,
    end: addHour(points[points.length - 1].time),
    kwh: Math.round(totalKWh * 10) / 10,
    averageKw: Math.round((totalKWh / Math.max(1, durationHours)) * 10) / 10,
    peakKw: Math.round(peakKw * 10) / 10,
    durationHours,
  };
}

function NightCard({
  title,
  startSoc,
  hours,
  loadW,
  averageNightLoadW,
  confidence,
  sampleCount,
}: {
  title: string;
  startSoc: number;
  hours: number;
  loadW: number;
  averageNightLoadW: number | null;
  confidence: LoadStability;
  sampleCount: number;
}) {
  const capacityWh = typeof window !== "undefined"
    ? Number(localStorage.getItem("shamsak_battery_capacity") || 4800)
    : 4800;
  const effectiveLoadW = averageNightLoadW ?? loadW;
  const result = calculateAutonomy(startSoc, capacityWh, effectiveLoadW, hours);
  const hasEnoughSamples = sampleCount >= 3;
  const confidenceClass = hasEnoughSamples
    ? result.sufficient
      ? "rounded-full bg-emerald-50 p-3 text-emerald-600"
      : "rounded-full bg-amber-50 p-3 text-amber-600"
    : "rounded-full bg-slate-100 p-3 text-slate-500";

  return (
    <div className="energy-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">
            {hasEnoughSamples
              ? result.sufficient
                ? "تكفي حتى الصباح"
                : "قد لا تكفي حتى الصباح"
              : "تقدير أولي — البيانات التاريخية غير كافية"}
          </h3>
        </div>
        <div className={confidenceClass}>
          <MoonStar size={21} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-50 p-3">
          <span className="text-xs font-bold text-slate-500">احتمال الصمود</span>
          <strong className={"mt-1 block font-black " + (hasEnoughSamples ? "text-2xl text-emerald-700" : "text-sm text-slate-500")}>{hasEnoughSamples ? `${result.probability}%` : "غير كافٍ للتقدير بعد"}</strong>
        </div>
        <div className="rounded-xl bg-sky-50 p-3">
          <span className="text-xs font-bold text-slate-500">المتوقع عند الشروق</span>
          <strong className={"mt-1 block font-black " + (hasEnoughSamples ? "text-2xl text-sky-700" : "text-sm text-slate-500")}>{hasEnoughSamples ? `${result.expectedSocAtSunrise}%` : "غير كافٍ للتقدير بعد"}</strong>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm font-semibold text-slate-500">
        <p>تغطية تقديرية {result.hoursCovered} ساعة عند متوسط استهلاك ليلي {Math.round(effectiveLoadW).toLocaleString("ar-LB")} واط.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={confidence === "عالية" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700" : confidence === "متوسطة" ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700" : confidence === "منخفضة" ? "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600"}>ثقة استقرار الاستهلاك: {confidence}</span>
          <span className="text-xs">عينات ليلية: {sampleCount}</span>
        </div>
        {!hasEnoughSamples && <p className="text-xs font-bold text-slate-600">يلزم توفر 3 أيام ليلية على الأقل قبل عرض نسبة ثقة رقمية.</p>}
        {averageNightLoadW === null && <p className="text-xs text-amber-700">لا توجد بيانات تاريخية ليلية كافية بعد؛ استُخدمت القراءة الحالية مؤقتًا.</p>}
      </div>
    </div>
  );
}

export function SmartForecast() {
  const { forecasts, weather, snapshot, loading, isRefreshing, error, nightLoadStats, refresh } = useSmartEnergy();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHourlyDetails, setShowHourlyDetails] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selected = forecasts[selectedIndex];
  const current = weather?.current;
  const surplus = useMemo(() => findSurplusWindow(selected), [selected]);

  const currentNight = useMemo(() => {
    if (!forecasts.length) return null;
    const now = Date.now();
    const today = forecasts[0];
    const tomorrow = forecasts[1];
    if (!today || !tomorrow) return null;

    const todaySunset = new Date(today.sunset).getTime();
    if (Number.isFinite(todaySunset) && now < todaySunset) {
      return {
        startSoc: today.chargeAtSunsetPct,
        hours: Math.max(0.5, (new Date(tomorrow.sunrise).getTime() - todaySunset) / 3600000),
      };
    }
    return {
      startSoc: snapshot?.batterySoc ?? today.chargeAtSunsetPct,
      hours: Math.max(0.5, (new Date(tomorrow.sunrise).getTime() - now) / 3600000),
    };
  }, [forecasts, snapshot]);

  const tomorrowNight = useMemo(() => {
    const tomorrow = forecasts[1];
    const after = forecasts[2];
    if (!tomorrow || !after) return null;
    return {
      startSoc: tomorrow.chargeAtSunsetPct,
      hours: Math.max(0.5, (new Date(after.sunrise).getTime() - new Date(tomorrow.sunset).getTime()) / 3600000),
    };
  }, [forecasts]);

  const handleRefresh = async () => {
    const ok = await refresh();
    setToast(ok ? "تم تحديث التوقعات ☀️" : "تعذر التحديث، تم الاحتفاظ بآخر بيانات ناجحة");
  };

  const loadW = snapshot?.homePowerW ?? 0;

  return (
    <section dir="rtl" className="relative space-y-4">
      {toast && (
        <div role="status" aria-live="polite" className="fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-xl">
          {toast}
        </div>
      )}

      <header className="energy-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-blue-600">شمسك • لوحة الطاقة</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">توقعات الطاقة</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">إنتاج شمسي، بطارية، فائض وأوقات مهمة</p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || isRefreshing}
            className="flex h-11 items-center gap-2 rounded-xl bg-blue-50 px-3 text-sm font-black text-blue-700 disabled:opacity-60"
          >
            {loading || isRefreshing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
            تحديث
          </button>
        </div>

        {current && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <span className="text-2xl">{weatherIcon(current.weather_code ?? 0)}</span>
            <div>
              <strong className="block text-sm font-black text-slate-800">{weatherLabel(current.weather_code ?? 0)} • {Math.round(current.temperature_2m ?? 0)}°م</strong>
              <span className="text-xs font-semibold text-slate-500">المصدر: Open-Meteo</span>
            </div>
          </div>
        )}

        {error && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">{error}.</p>}
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {forecasts.map((day, index) => (
          <button
            key={day.date}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={
              "min-w-[92px] rounded-2xl border px-3 py-3 text-center transition " +
              (selectedIndex === index
                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600")
            }
          >
            <span className="block text-xs font-black">{day.label}</span>
            <span className="mt-1 block text-lg">{weatherIcon(day.weatherCode)}</span>
            <span className="block text-[11px] font-bold">{formatDate(day.date)}</span>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <section className="energy-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500">{selected.label} • {formatDate(selected.date)}</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{weatherIcon(selected.weatherCode)} {weatherLabel(selected.weatherCode)}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{Math.round(selected.tempMin)}° — {Math.round(selected.tempMax)}°م</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <SunMedium size={27} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-amber-50 p-4">
                <span className="text-xs font-bold text-slate-500">إنتاج الألواح المتوقع</span>
                <strong className="mt-1 block text-2xl font-black text-amber-700">{selected.productionKWh} <small className="text-sm">ك.و.س</small></strong>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <span className="text-xs font-bold text-slate-500">ثقة التوقع الجوي</span>
                <strong className="mt-1 block text-2xl font-black text-emerald-700">{selected.confidence}</strong>
              </div>
            </div>
          </section>

          <section className="energy-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">⏱️ أوقات مهمة</h2>
              <Clock3 size={20} className="text-slate-400" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-500">امتلاء البطارية المتوقع</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">{formatHour(selected.fullChargeTime)}</strong>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-500">شحن عند الغروب</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">{selected.chargeAtSunsetPct}%</strong>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-500">شحن عند الشروق</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">{selected.chargeAtSunrisePct}%</strong>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-500">الشروق / الغروب</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">{formatHour(selected.sunrise)} / {formatHour(selected.sunset)}</strong>
              </div>
            </div>
          </section>

          <section className="energy-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-900">🌙 كفاية الليل</h2>
              <InfoTip label="كيف نحسب كفاية الليل" title="كفاية الليل">
                تقدير تقريبي يعتمد على نسبة البطارية، سعة البطارية، الاستهلاك الحالي والوقت المتوقع حتى الشروق، مع احتساب احتياطي أمان 10%.
              </InfoTip>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {currentNight && <NightCard title="الليلة الحالية" startSoc={currentNight.startSoc} hours={currentNight.hours} loadW={loadW} averageNightLoadW={nightLoadStats.averageW} confidence={nightLoadStats.confidence} sampleCount={nightLoadStats.sampleCount} />}
              {tomorrowNight && <NightCard title="ليلة الغد" startSoc={tomorrowNight.startSoc} hours={tomorrowNight.hours} loadW={loadW} averageNightLoadW={nightLoadStats.averageW} confidence={nightLoadStats.confidence} sampleCount={nightLoadStats.sampleCount} />}
            </div>
          </section>

          {surplus && (
            <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-amber-600 shadow-sm"><Zap size={23} /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-amber-900">☀️ فائض شمسي متوقع</h2>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  </div>
                  <strong className="mt-1 block text-3xl font-black text-amber-800">{surplus.kwh} ك.و.س</strong>
                  <p className="mt-1 text-sm font-bold text-amber-900/70">خلال {formatHour(surplus.start)} — {formatHour(surplus.end)} • مدة تقريبية {surplus.durationHours} ساعة</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white/80 p-3">
                      <span className="block text-[11px] font-bold text-slate-500">متوسط الفائض</span>
                      <strong className="mt-1 block text-lg font-black text-amber-800">{surplus.averageKw} kW</strong>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3">
                      <span className="block text-[11px] font-bold text-slate-500">ذروة الفائض</span>
                      <strong className="mt-1 block text-lg font-black text-amber-800">{surplus.peakKw} kW</strong>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">النافذة تُحسب عندما يتجاوز الإنتاج الشمسي استهلاك المنزل وما يمكن للبطارية استيعابه؛ لا تُعرض كتوصية تشغيل ثابتة.</p>

                </div>
              </div>
            </section>
          )}

          <section className="energy-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-900">توزيع الطاقة الشمسية اليومية</h2>
              <InfoTip label="شرح توزيع الطاقة" title="توزيع الطاقة">
                تقسيم إنتاج الشمس المتوقع لهذا اليوم إلى استهلاك منزلي مباشر، شحن البطارية، وفائض متبقٍ بعد استيعاب البطارية. النسب محسوبة من إجمالي الإنتاج المتوقع.
              </InfoTip>
            </div>
            <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-slate-100" aria-label="توزيع إنتاج الطاقة الشمسية">
              <div className="bg-blue-500" style={{ width: selected.homePct + "%" }} title={"المنزل " + selected.homePct + "%"} />
              <div className="bg-emerald-500" style={{ width: selected.batteryPct + "%" }} title={"البطارية " + selected.batteryPct + "%"} />
              <div className="bg-amber-400" style={{ width: selected.surplusPct + "%" }} title={"الفائض " + selected.surplusPct + "%"} />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">إجمالي الإنتاج الشمسي المتوقع: {selected.productionKWh} ك.و.س</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["استهلاك المنزل نهارًا", selected.homePct, selected.homeKWh, "text-blue-700", "bg-blue-50"],
                ["شحن البطارية", selected.batteryPct, selected.batteryKWh, "text-emerald-700", "bg-emerald-50"],
                ["فائض بلا استخدام", selected.surplusPct, selected.surplusKWh, "text-amber-700", "bg-amber-50"],
              ].map(([label, pct, kwh, textColor, bg]) => (
                <div key={String(label)} className={String(bg) + " rounded-2xl p-3"}>
                  <span className="block text-xs font-bold text-slate-500">{label}</span>
                  <strong className={"mt-1 block text-xl font-black " + String(textColor)}>{String(pct)}%</strong>
                  <span className="text-xs font-bold text-slate-500">{String(kwh)} ك.و.س</span>
                </div>
              ))}
            </div>
          </section>

          <section id="hourly-details" className="energy-card p-5">
            <button
              type="button"
              onClick={() => setShowHourlyDetails((value) => !value)}
              className="flex w-full items-center justify-between gap-2 text-right"
              aria-expanded={showHourlyDetails}
              aria-controls="hourly-details-content"
            >
              <div className="flex items-center gap-2">
                <CloudSun size={20} className="text-slate-400" />
                <div>
                  <h2 className="text-lg font-black text-slate-900">تفصيل الساعات</h2>
                  <p className="text-xs font-semibold text-slate-500">اضغط لعرض التوقعات ساعة بساعة</p>
                </div>
              </div>
              <span className="text-slate-500 text-lg font-black">{showHourlyDetails ? "⌃" : "⌄"}</span>
            </button>
            {showHourlyDetails && (
            <div id="hourly-details-content" className="mt-4 space-y-2">
              {selected.hourly.map((point) => (
                <div key={point.time} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="text-xs font-black text-slate-500">{formatHour(point.time)}</span>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                      <span>{weatherIcon(point.weatherCode)}</span>
                      <span>{Math.round(point.irradianceWm2)} W/m²</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">إنتاج متوقع {point.solarKWh.toFixed(2)} ك.و.س • مطر {Math.round(point.precipitationProbability)}%</span>
                  </div>
                  <span className="text-xs font-black text-amber-700">فائض {point.surplusKWh.toFixed(2)}</span>
                </div>
              ))}
            </div>
            )}
          </section>
        </>
      )}

      <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm font-semibold leading-6 text-sky-900">
        <strong className="font-black">تنويه:</strong> بيانات الطقس والإشعاع من Open-Meteo للاطلاع والتوقع فقط. لا تعدّل أو تستبدل قراءات الإنفرتر الحية ولا تُعامل كقياس فعلي للنظام.
      </div>
    </section>
  );
}
