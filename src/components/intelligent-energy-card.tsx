"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, CheckCircle2, Sparkles, Sun } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { analyzeEnergy, type IntelligentEnergyContext, type IntelligentEnergySettings } from "@/lib/intelligent-energy";

const DEFAULT_SETTINGS: IntelligentEnergySettings = { batteryCapacityWh: 4800, batteryMinReservePct: 10 };
const HISTORY_KEY = "shamsak_intelligent_energy_history_v2";
const MAX_HISTORY_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_SAMPLES = 120;

type TrendSample = { timestamp: string; batterySoc: number; homePowerW: number; solarPowerW: number };

function readTrendHistory(): TrendSample[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as TrendSample[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((item) => {
      const time = new Date(item.timestamp).getTime();
      return Number.isFinite(time) && now - time >= 0 && now - time <= MAX_HISTORY_AGE_MS &&
        Number.isFinite(item.batterySoc) && Number.isFinite(item.homePowerW) && Number.isFinite(item.solarPowerW);
    }).slice(-MAX_HISTORY_SAMPLES);
  } catch {
    return [];
  }
}

function collectTrendContext(snapshot: EnergySnapshot | null) {
  if (typeof window === "undefined" || !snapshot || snapshot.source !== "live") {
    return { recentAverageHomePowerW: null, recentAverageSolarPowerW: null, batterySocDropPerHour: null };
  }

  const samples = readTrendHistory();
  const timestamp = new Date(snapshot.timestamp).getTime();
  const last = samples[samples.length - 1];
  if (!last || timestamp - new Date(last.timestamp).getTime() >= 60_000) {
    samples.push({
      timestamp: snapshot.timestamp,
      batterySoc: Math.min(100, Math.max(0, snapshot.batterySoc)),
      homePowerW: Math.max(0, snapshot.homePowerW),
      solarPowerW: Math.max(0, snapshot.solarPowerW),
    });
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(samples.slice(-MAX_HISTORY_SAMPLES)));
    } catch {}
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
  const [trendContext, setTrendContext] = useState<IntelligentEnergyContext>({});

  useEffect(() => {
    let active = true;
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Record<string, unknown> | null) => {
        if (!active || !data) return;
        const capacity = typeof data.batteryCapacityWh === "number" && Number.isFinite(data.batteryCapacityWh) && data.batteryCapacityWh > 0 ? data.batteryCapacityWh : DEFAULT_SETTINGS.batteryCapacityWh;
        const reserve = typeof data.batteryMinReservePct === "number" && Number.isFinite(data.batteryMinReservePct) && data.batteryMinReservePct >= 0 && data.batteryMinReservePct < 100 ? data.batteryMinReservePct : DEFAULT_SETTINGS.batteryMinReservePct;
        setSettings({ batteryCapacityWh: capacity, batteryMinReservePct: reserve });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setTrendContext(collectTrendContext(snapshot));
  }, [snapshot]);

  const insight = useMemo(
    () => (snapshot ? analyzeEnergy(snapshot, settings, trendContext) : null),
    [snapshot, settings, trendContext],
  );
  if (!insight) return null;

  const tone = {
    green: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", title: "text-emerald-900" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", title: "text-amber-900" },
    red: { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-600", title: "text-rose-900" },
    blue: { bg: "bg-sky-50", border: "border-sky-200", icon: "text-sky-600", title: "text-sky-900" },
  }[insight.tone];
  const Icon = insight.tone === "green" ? CheckCircle2 : insight.tone === "red" ? AlertTriangle : insight.tone === "amber" ? BatteryCharging : Sun;

  return (
    <section className={`energy-card overflow-hidden border ${tone.border} ${tone.bg}`} dir="rtl" aria-label="مراقبة شمسك الذكي">
      <div className="flex items-start gap-3 p-3.5">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 ${tone.icon}`}><Sparkles size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black ${tone.title}`}>مراقبة شمسك الذكي</span>
            {insight.alert && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">تنبيه</span>}
            <Icon size={15} className={tone.icon} aria-hidden="true" />
          </div>
          <div className={`mt-1 text-sm font-black ${tone.title}`}>{insight.title}</div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{insight.summary}</p>
          {insight.alert && <p className="mt-2 text-xs font-black leading-5 text-slate-800">الإجراء: {insight.action}</p>}
        </div>
      </div>
    </section>
  );
}
