"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, CheckCircle2, ChevronDown, Sparkles, Sun } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { acAmps } from "@/lib/energy";
import { AmpPill } from "@/components/amp-pill";
import { analyzeEnergy, type IntelligentEnergyContext, type IntelligentEnergySettings } from "@/lib/intelligent-energy";
import { sunTimes } from "@/lib/solar-core";

const DEFAULT_SETTINGS: IntelligentEnergySettings = { batteryCapacityWh: 4800, batteryMinReservePct: 10 };
const DEFAULT_LOCATION = { latitude: 33.8938, longitude: 35.5018 };
const HISTORY_KEY = "shamsak_intelligent_energy_history_v2";
const MAX_HISTORY_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_SAMPLES = 120;
const NIGHT_SOLAR_TOLERANCE_W = 100;

type TrendSample = { timestamp: string; batterySoc: number; homePowerW: number; solarPowerW: number };
type SolarLocation = { latitude: number; longitude: number };

function readTrendHistory(): TrendSample[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as TrendSample[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((item) => {
      const time = new Date(item.timestamp).getTime();
      return Number.isFinite(time) && now - time >= 0 && now - time <= MAX_HISTORY_AGE_MS && Number.isFinite(item.batterySoc) && Number.isFinite(item.homePowerW) && Number.isFinite(item.solarPowerW);
    }).slice(-MAX_HISTORY_SAMPLES);
  } catch { return []; }
}

function collectTrendContext(snapshot: EnergySnapshot | null) {
  if (typeof window === "undefined" || !snapshot || snapshot.source !== "live") return { recentAverageHomePowerW: null, recentAverageSolarPowerW: null, batterySocDropPerHour: null };
  const samples = readTrendHistory();
  const timestamp = new Date(snapshot.timestamp).getTime();
  const last = samples[samples.length - 1];
  if (!last || timestamp - new Date(last.timestamp).getTime() >= 60_000) {
    samples.push({ timestamp: snapshot.timestamp, batterySoc: Math.min(100, Math.max(0, snapshot.batterySoc)), homePowerW: Math.max(0, snapshot.homePowerW), solarPowerW: Math.max(0, snapshot.solarPowerW) });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(samples.slice(-MAX_HISTORY_SAMPLES))); } catch {}
  }
  const recent = samples.slice(-12);
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const recentAverageHomePowerW = average(recent.map((item) => item.homePowerW));
  const recentAverageSolarPowerW = average(recent.map((item) => item.solarPowerW));
  let batterySocDropPerHour: number | null = null;
  if (samples.length >= 4) {
    const first = samples[Math.max(0, samples.length - 12)];
    const lastSample = samples[samples.length - 1];
    const elapsedHours = (new Date(lastSample.timestamp).getTime() - new Date(first.timestamp).getTime()) / 3_600_000;
    const drop = first.batterySoc - lastSample.batterySoc;
    if (elapsedHours >= 0.05 && drop > 0) batterySocDropPerHour = drop / elapsedHours;
  }
  return { recentAverageHomePowerW, recentAverageSolarPowerW, batterySocDropPerHour };
}

export function IntelligentEnergyCard({ snapshot }: { snapshot: EnergySnapshot | null }) {
  const [settings, setSettings] = useState<IntelligentEnergySettings>(DEFAULT_SETTINGS);
  const [solarLocation, setSolarLocation] = useState<SolarLocation>(DEFAULT_LOCATION);
  const [trendContext, setTrendContext] = useState<IntelligentEnergyContext>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Record<string, unknown> | null) => {
        if (!active || !data) return;
        const capacity = typeof data.batteryCapacityWh === "number" && Number.isFinite(data.batteryCapacityWh) && data.batteryCapacityWh > 0 ? data.batteryCapacityWh : DEFAULT_SETTINGS.batteryCapacityWh;
        const reserve = typeof data.batteryMinReservePct === "number" && Number.isFinite(data.batteryMinReservePct) && data.batteryMinReservePct >= 0 && data.batteryMinReservePct < 100 ? data.batteryMinReservePct : DEFAULT_SETTINGS.batteryMinReservePct;
        const latitude = typeof data.latitude === "number" && Number.isFinite(data.latitude) && data.latitude >= -90 && data.latitude <= 90 ? data.latitude : DEFAULT_LOCATION.latitude;
        const longitude = typeof data.longitude === "number" && Number.isFinite(data.longitude) && data.longitude >= -180 && data.longitude <= 180 ? data.longitude : DEFAULT_LOCATION.longitude;
        setSettings({ batteryCapacityWh: capacity, batteryMinReservePct: reserve });
        setSolarLocation({ latitude, longitude });
      }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => { setTrendContext(collectTrendContext(snapshot)); }, [snapshot]);

  const solarState = useMemo(() => {
    if (!snapshot) return { isNight: false, suspicious: false };
    const instant = new Date(snapshot.timestamp);
    if (!Number.isFinite(instant.getTime())) return { isNight: false, suspicious: false };
    const { sunrise, sunset } = sunTimes(instant, solarLocation.latitude, solarLocation.longitude);
    const isNight = instant < sunrise || instant > sunset;
    const solarPowerW = Math.max(0, Number.isFinite(snapshot.solarPowerW) ? snapshot.solarPowerW : 0);
    return { isNight, suspicious: isNight && solarPowerW > NIGHT_SOLAR_TOLERANCE_W };
  }, [snapshot, solarLocation]);

  const analysisSnapshot = useMemo(() => {
    if (!snapshot || !solarState.isNight) return snapshot;
    return { ...snapshot, solarPowerW: 0 };
  }, [snapshot, solarState.isNight]);

  const analysisContext = useMemo<IntelligentEnergyContext>(() => {
    if (!solarState.isNight) return trendContext;
    return { ...trendContext, recentAverageSolarPowerW: null };
  }, [trendContext, solarState.isNight]);

  const insight = useMemo(() => (analysisSnapshot ? analyzeEnergy(analysisSnapshot, settings, analysisContext) : null), [analysisSnapshot, settings, analysisContext]);

  const displayInsight = useMemo(() => {
    if (!insight || !snapshot || !solarState.isNight) return insight;
    const solarPowerW = Math.max(0, Number.isFinite(snapshot.solarPowerW) ? snapshot.solarPowerW : 0);
    if (solarState.suspicious) {
      return {
        tone: "amber" as const,
        alert: true,
        title: "قراءة الإنتاج الشمسي غير منطقية",
        summary: `الوقت الحالي بعد غروب الشمس، لكن الإنفرتر يرسل ${(solarPowerW / 1000).toFixed(1)} kW كإنتاج شمسي.`,
        action: "تحقق من قراءة الإنفرتر أو SmartESS/Gateway",
        recommendation: "شمسك لن يعتبر هذه القراءة إنتاجاً شمسياً ليلاً ولن يرسل تنبيه انخفاض إنتاج بسببها.",
        details: ["تم التعرف على الليل اعتماداً على موقع المنظومة ووقت الشروق والغروب المحسوبين.", "إذا استمرت القراءة غير الطبيعية بعد عدة قراءات، راجع مصدر pv_power أو اتصال الداتالوجر."],
      };
    }
    if (!insight.alert) {
      return {
        ...insight,
        tone: "blue" as const,
        title: "وضع الليل",
        summary: `الشمس غائبة الآن. الإنتاج الشمسي المتوقع 0 kW، واستهلاك المنزل ${Math.max(0, snapshot.homePowerW / 1000).toFixed(1)} kW.`,
        action: "لا يوجد إجراء متعلق بالألواح الآن",
        recommendation: "تتم مراقبة البطارية والشبكة خلال الليل بدلاً من مقارنة الإنتاج بمتوسط النهار.",
        details: ["لا يتم احتساب الليل كحالة انخفاض إنتاج شمسي.", ...insight.details],
      };
    }
    return insight;
  }, [insight, snapshot, solarState]);

  if (!displayInsight) return null;

  const homeW = Math.max(0, snapshot?.homePowerW ?? 0);
  const homeKw = homeW / 1000;
  const homeAmps = acAmps(homeW);

  const tone = {
    green: { bg: "bg-emerald-50", border: "border-emerald-300", ring: "ring-1 ring-emerald-200/70", shadow: "shadow-[0_8px_24px_rgba(16,185,129,0.12)]", icon: "text-emerald-600", title: "text-emerald-900" },
    amber: { bg: "bg-amber-50", border: "border-amber-300", ring: "ring-1 ring-amber-200/70", shadow: "shadow-[0_8px_24px_rgba(245,158,11,0.14)]", icon: "text-amber-600", title: "text-amber-900" },
    red: { bg: "bg-rose-50", border: "border-rose-300", ring: "ring-1 ring-rose-200/70", shadow: "shadow-[0_8px_24px_rgba(244,63,94,0.16)]", icon: "text-rose-600", title: "text-rose-900" },
    blue: { bg: "bg-sky-50", border: "border-sky-300", ring: "ring-1 ring-sky-200/70", shadow: "shadow-[0_8px_24px_rgba(14,165,233,0.10)]", icon: "text-sky-600", title: "text-sky-900" },
  }[displayInsight.tone];
  const Icon = displayInsight.tone === "green" ? CheckCircle2 : displayInsight.tone === "red" ? AlertTriangle : displayInsight.tone === "amber" ? BatteryCharging : Sun;

  return (
    <section className={`overflow-hidden rounded-2xl border ${tone.border} ${tone.bg} ${tone.ring} ${tone.shadow} transition-colors duration-500`} dir="rtl" aria-label="مراقبة شمسك الذكي">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center gap-3 p-3.5 text-right transition hover:bg-white/40 active:bg-white/60">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 ${tone.icon}`}><Sparkles size={17} /></div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`text-xs font-black ${tone.title}`}>مراقبة شمسك الذكي</span>{displayInsight.alert && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">تنبيه</span>}<Icon size={15} className={tone.icon} aria-hidden="true" /></div><div className={`mt-1 text-sm font-black ${tone.title}`}>{displayInsight.title}</div></div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 ${tone.icon} transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true"><ChevronDown size={17} /></span>
      </button>
      {open && <div className="border-t border-white/70 px-3.5 pb-3.5 pt-1">
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-inset ring-white/80">
          <span className="text-[10px] font-bold text-slate-500">الاستهلاك</span>
          <div className="flex items-center gap-2"><span className="text-xs font-black text-slate-800"><bdi dir="ltr">{homeKw.toFixed(2)} kW</bdi></span><AmpPill tone="sky" amps={homeAmps} /></div>
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{displayInsight.summary}</p>
        {displayInsight.alert && <p className="mt-2 text-xs font-black leading-5 text-slate-800">الإجراء: {displayInsight.action}</p>}
      </div>}
    </section>
  );
}
