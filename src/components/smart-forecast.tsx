"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, CloudSun, Loader2, MoonStar, RefreshCw, SunMedium } from "lucide-react";
import { useSharedSmartEnergy } from "@/components/smart-energy-provider";
import { calculateAutonomy, weatherIcon, weatherLabel, type DayForecast, type LoadStability } from "@/lib/smart-forecast";
import { InfoTip } from "@/components/info-tip";
import { AmpPill } from "@/components/amp-pill";
import { acAmps } from "@/lib/energy";

function formatHour(iso?: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-LB-u-nu-latn", {
    timeZone: "Asia/Beirut",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ar-LB-u-nu-latn", {
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
  capacityWh,
  reservePct,
}: {
  title: string;
  startSoc: number;
  hours: number;
  loadW: number;
  averageNightLoadW: number | null;
  confidence: LoadStability;
  sampleCount: number;
  capacityWh: number;
  reservePct: number;
}) {
  const effectiveLoadW = averageNightLoadW ?? loadW;
  const result = calculateAutonomy(startSoc, capacityWh, effectiveLoadW, hours, reservePct);
  // Needs a real spread of night readings, not three taken a minute apart.
  const hasEnoughSamples = sampleCount >= 8;
  const confidenceClass = hasEnoughSamples
    ? result.sufficient
      ? "rounded-full bg-emerald-50 p-3 text-emerald-600"
      : "rounded-full bg-indigo-50 p-3 text-indigo-500"
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
                : result.probability >= 90
                  ? "تكفي تقريبًا — على الحافة"
                  : "قد لا تكفي حتى الصباح"
              : "تقدير أولي — البيانات التاريخية غير كافية"}
          </h3>
        </div>
        <div className={confidenceClass}>
          <MoonStar size={21} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={"rounded-xl p-3 " + (result.sufficient ? "bg-emerald-50" : result.probability >= 90 ? "bg-amber-50" : "bg-rose-50")}>
          <span className="text-xs font-bold text-slate-500">تغطية الليل</span>
          <strong className={"mt-1 block font-black " + (hasEnoughSamples ? "text-2xl " + (result.sufficient ? "text-emerald-700" : result.probability >= 90 ? "text-amber-700" : "text-rose-700") : "text-sm text-slate-500")}>{hasEnoughSamples ? `${result.probability}%` : "غير كافٍ للتقدير بعد"}</strong>
        </div>
        <div className="rounded-xl bg-indigo-50 p-3">
          <span className="text-xs font-bold text-slate-500">المتوقع عند الشروق</span>
          <strong className={"mt-1 block font-black " + (hasEnoughSamples ? "text-2xl text-indigo-700" : "text-sm text-slate-500")}>{hasEnoughSamples ? `${result.expectedSocAtSunrise}%` : "غير كافٍ للتقدير بعد"}</strong>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm font-semibold text-slate-500">
        <p>تغطية تقديرية {result.hoursCovered} ساعة عند متوسط استهلاك ليلي {Math.round(effectiveLoadW).toLocaleString("en-US")} واط <AmpPill tone="sky" amps={acAmps(effectiveLoadW)} className="mr-1 align-middle" /></p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={confidence === "عالية" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700" : confidence === "متوسطة" ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700" : confidence === "منخفضة" ? "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600"}>ثقة استقرار الاستهلاك: {confidence}</span>
          <span className="text-xs">عينات ليلية: {sampleCount}</span>
        </div>
        {!hasEnoughSamples && <p className="text-xs font-bold text-slate-600">يلزم توفر 3 أيام ليلية على الأقل قبل عرض نسبة ثقة رقمية.</p>}
        {averageNightLoadW === null && <p className="text-xs text-slate-500">لا توجد بيانات تاريخية ليلية كافية بعد؛ استُخدمت القراءة الحالية مؤقتًا.</p>}
      </div>
    </div>
  );
}

export function SmartForecast() {
  const { forecasts, weather, snapshot, loading, isRefreshing, error, nightLoadStats, batteryCapacityWh, reservePct, refresh } = useSharedSmartEnergy();
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

  // Arriving from the home card ("/energy#night"): the section only exists
  // after the forecast loads, so scroll once it is rendered.
  useEffect(() => {
    if (!forecasts.length || typeof window === "undefined" || window.location.hash !== "#night") return;
    requestAnimationFrame(() => document.getElementById("night")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [forecasts.length]);

  const currentNight = useMemo(() => {
    if (!forecasts.length) return null;
    const now = Date.now();
    const today = forecasts[0];
    const tomorrow = forecasts[1];
    if (!today || !tomorrow) return null;

    // After midnight and before today's sunrise we are still inside last night.
    const todaySunrise = new Date(today.sunrise).getTime();
    if (Number.isFinite(todaySunrise) && now < todaySunrise) {
      return { inProgress: true, startSoc: snapshot?.batterySoc ?? today.chargeAtSunrisePct, hours: Math.max(0.5, (todaySunrise - now) / 3600000) };
    }
    const todaySunset = new Date(today.sunset).getTime();
    if (Number.isFinite(todaySunset) && now < todaySunset) {
      return {
        inProgress: false,
        startSoc: today.chargeAtSunsetPct,
        hours: Math.max(0.5, (new Date(tomorrow.sunrise).getTime() - todaySunset) / 3600000),
      };
    }
    return {
      inProgress: true,
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/70"><SunMedium className="h-5 w-5" aria-hidden="true" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-amber-600">شمسك • الطاقة</p>
            <h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">توقعات الطاقة</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">اليوم، الليلة، وأفضل وقت لاستخدام الشمس.</p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || isRefreshing}
            className="flex h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-black text-amber-700 disabled:opacity-60"
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
              <span className="text-xs font-semibold text-slate-500">توقع جوي من Open-Meteo، وليس قياساً من الإنفرتر</span>
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
                ? "border-amber-400 bg-amber-50 text-amber-800 shadow-sm"
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
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-500">امتلاء البطارية المتوقع</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">{formatHour(selected.fullChargeTime)}</strong>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-500">شحن عند الغروب</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">{selected.chargeAtSunsetPct}%</strong>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-500">{selectedIndex === 0 && Date.now() > new Date(selected.sunrise).getTime() ? "الشحن الآن" : "شحن عند الشروق"}</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">{selected.chargeAtSunrisePct}%</strong>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-500">الشروق / الغروب</span>
                <strong className="mt-1 block whitespace-nowrap text-base font-black text-slate-900">{formatHour(selected.sunrise)} / {formatHour(selected.sunset)}</strong>
              </div>
            </div>
          </section>


          <section id="night" className="energy-card scroll-mt-40 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-900">🌙 كفاية الليل</h2>
              <InfoTip label="كيف نحسب كفاية الليل" title="كفاية الليل">
                تقدير تقريبي يعتمد على نسبة البطارية، سعة البطارية، الاستهلاك الحالي والوقت المتوقع حتى الشروق، مع إبقاء حد الاحتياطي المحفوظ في الإعدادات.
              </InfoTip>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {currentNight && <NightCard title={currentNight.inProgress ? "الليلة الحالية" : "الليلة القادمة"} startSoc={currentNight.startSoc} hours={currentNight.hours} loadW={loadW} averageNightLoadW={nightLoadStats.averageW} confidence={nightLoadStats.confidence} sampleCount={nightLoadStats.sampleCount} capacityWh={batteryCapacityWh} reservePct={reservePct} />}
              {tomorrowNight && <NightCard title="ليلة الغد" startSoc={tomorrowNight.startSoc} hours={tomorrowNight.hours} loadW={loadW} averageNightLoadW={nightLoadStats.averageW} confidence={nightLoadStats.confidence} sampleCount={nightLoadStats.sampleCount} capacityWh={batteryCapacityWh} reservePct={reservePct} />}
            </div>
          </section>

          <details className="energy-card group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
              <h2 className="text-lg font-black text-slate-900">توزيع الطاقة الشمسية اليومية</h2>
              <ChevronDown size={20} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">تقسيم إنتاج اليوم المتوقع إلى استهلاك مباشر وشحن للبطارية وفائض متبقٍ.</p>
            <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-slate-100" aria-label="توزيع إنتاج الطاقة الشمسية">
              <div className="bg-sky-500" style={{ width: selected.homePct + "%" }} title={"المنزل " + selected.homePct + "%"} />
              <div className="bg-emerald-500" style={{ width: selected.batteryPct + "%" }} title={"البطارية " + selected.batteryPct + "%"} />
              <div className="bg-amber-400" style={{ width: selected.surplusPct + "%" }} title={"الفائض " + selected.surplusPct + "%"} />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">إجمالي الإنتاج الشمسي المتوقع: {selected.productionKWh} ك.و.س</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["استهلاك المنزل نهارًا", selected.homePct, selected.homeKWh, "text-sky-700", "bg-sky-50"],
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
          </details>

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
                    {point.solarKWh > 0 && <span className="mt-1 block"><AmpPill tone="amber" amps={acAmps(point.solarKWh * 1000)} /></span>}
                  </div>
                  <span className="text-xs font-black text-amber-700">فائض {point.surplusKWh.toFixed(2)}</span>
                </div>
              ))}
            </div>
            )}
          </section>
        </>
      )}

    </section>
  );
}
