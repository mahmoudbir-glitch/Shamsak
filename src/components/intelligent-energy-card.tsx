"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, CheckCircle2, Sparkles, Sun } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { analyzeEnergy, type IntelligentEnergyContext, type IntelligentEnergySettings } from "@/lib/intelligent-energy";

const DEFAULT_SETTINGS: IntelligentEnergySettings = { batteryCapacityWh: 4800, batteryMinReservePct: 10 };
const BATTERY_HISTORY_KEY = "shamsak_intelligent_battery_history_v1";
const MAX_HISTORY_AGE_MS = 24 * 60 * 60 * 1000;

function recentBatterySocDropPerHour(snapshot: EnergySnapshot | null) {
  if (typeof window === "undefined" || !snapshot || snapshot.source !== "live" || !Number.isFinite(snapshot.batterySoc)) return null;
  const now = Date.now();
  let samples: Array<{ timestamp: string; batterySoc: number }> = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(BATTERY_HISTORY_KEY) || "[]") as Array<{ timestamp: string; batterySoc: number }>;
    samples = Array.isArray(parsed) ? parsed.filter((item) => Number.isFinite(new Date(item.timestamp).getTime()) && Number.isFinite(item.batterySoc)) : [];
  } catch { samples = []; }
  samples = samples.filter((item) => now - new Date(item.timestamp).getTime() <= MAX_HISTORY_AGE_MS);
  const last = samples[samples.length - 1];
  if (!last || new Date(snapshot.timestamp).getTime() - new Date(last.timestamp).getTime() >= 60_000) {
    samples.push({ timestamp: snapshot.timestamp, batterySoc: Math.min(100, Math.max(0, snapshot.batterySoc)) });
    try { localStorage.setItem(BATTERY_HISTORY_KEY, JSON.stringify(samples.slice(-120))); } catch {}
  }
  if (samples.length < 4) return null;
  const first = samples[Math.max(0, samples.length - 12)];
  const lastSample = samples[samples.length - 1];
  const elapsedHours = (new Date(lastSample.timestamp).getTime() - new Date(first.timestamp).getTime()) / 3_600_000;
  const drop = first.batterySoc - lastSample.batterySoc;
  if (elapsedHours < 0.05 || drop <= 0) return null;
  return drop / elapsedHours;
}

export function IntelligentEnergyCard({ snapshot }: { snapshot: EnergySnapshot | null }) {
  const [settings, setSettings] = useState<IntelligentEnergySettings>(DEFAULT_SETTINGS);
  const [batteryDropPerHour, setBatteryDropPerHour] = useState<number | null>(null);

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

  useEffect(() => { setBatteryDropPerHour(recentBatterySocDropPerHour(snapshot)); }, [snapshot]);

  const context = useMemo<IntelligentEnergyContext>(() => ({ batterySocDropPerHour: batteryDropPerHour }), [batteryDropPerHour]);
  const insight = useMemo(() => (snapshot ? analyzeEnergy(snapshot, settings, context) : null), [snapshot, settings, context]);
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
