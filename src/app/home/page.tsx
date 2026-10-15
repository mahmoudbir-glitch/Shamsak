"use client";

import { HomeSourceSplit } from "@/components/energy-split";
import React, { useCallback, useEffect, useState } from "react";
import { Home, Loader2, RefreshCw } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { LoadChart, type LoadPoint } from "@/components/load-chart";
import { homeText, acAmps } from "@/lib/energy";
import { AmpPill } from "@/components/amp-pill";
import { startVisiblePolling } from "@/lib/visible-polling";

const REFRESH_MS = 15_000;
const HISTORY_REFRESH_MS = 5 * 60_000;

type History = { points: LoadPoint[]; peak: { w: number; at: string } | null; inverterRatedKw: number | null; timezone: string };

function ConsumptionHero({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-sky-100 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f4faff_58%,#eef8ff_100%)] p-4 shadow-[0_14px_40px_rgba(14,165,233,0.10)] sm:p-5">
      <div className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-sky-200/30 blur-3xl" /><div className="pointer-events-none absolute -bottom-16 right-8 h-32 w-32 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-sky-600 shadow-sm ring-1 ring-sky-100"><Home size={24} strokeWidth={2.2} /></div><div className="min-w-0"><h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">استهلاك المنزل</h1><p className="mt-0.5 text-[11px] font-semibold text-slate-500 sm:text-xs">صورة سريعة لاستهلاك بيتك والطاقة المسحوبة</p></div></div><button type="button" onClick={onRefresh} disabled={refreshing} aria-label="تحديث البيانات" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/80 text-slate-500 shadow-sm transition hover:bg-white active:scale-95 disabled:opacity-50"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /></button></div>
    </section>
  );
}

export default function HomeConsumptionPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<History | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/telemetry/history", { cache: "no-store" });
      if (response.ok) setHistory((await response.json()) as History);
    } catch {
      // المنحنى اختياري؛ الصفحة تعمل بدونه.
    }
  }, []);

  const load = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
      void loadHistory();
    }
    try {
      const response = await fetch("/api/telemetry", { cache: "no-store" });
      if (!response.ok) throw new Error("telemetry_unavailable");
      const data = (await response.json()) as EnergySnapshot;
      if (data.source !== "live") throw new Error("not_live");
      setSnapshot(data);
    } catch {
      // Keep the last valid reading visible instead of replacing it with demo values.
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    void loadHistory();
    return startVisiblePolling(() => void loadHistory(), HISTORY_REFRESH_MS);
  }, [loadHistory]);

  useEffect(() => {
    void load();
    return startVisiblePolling(() => void load(), REFRESH_MS);
  }, [load]);

  const homeW = Math.max(0, snapshot?.homePowerW ?? 0);
  const homeKw = homeW / 1000;
  const toneText = homeText(homeKw);

  // من أين يأتي حمل المنزل الآن: الشمس أولاً، ثم البطارية، والباقي من الشبكة.
  const fromSolar = Math.min(homeW, Math.max(0, snapshot?.solarPowerW ?? 0));
  const fromBattery = Math.min(homeW - fromSolar, Math.max(0, -(snapshot?.batteryPowerW ?? 0)));
  // The grid only counts what it really delivers (measured, or the shortfall
  // while on mains). Off-grid the small leftover is the inverter's own loss,
  // so it must not show up as "from the grid".
  const fromGrid = Math.min(Math.max(0, homeW - fromSolar - fromBattery), Math.max(0, snapshot?.gridPowerW ?? 0));
  const served = fromSolar + fromBattery + fromGrid;
  // Rounded so the three always add up to 100 (33 + 33 + 33 left 1% unexplained).
  const solarPct = served > 0 ? Math.round((fromSolar / served) * 100) : 0;
  const batteryPct = served > 0 ? Math.min(100 - solarPct, Math.round((fromBattery / served) * 100)) : 0;
  const gridPct = served > 0 ? 100 - solarPct - batteryPct : 0;
  const sources = [
    { label: "الشمس", w: fromSolar, pct: solarPct, bar: "bg-amber-400", text: "text-amber-700", tone: "amber" as const },
    { label: "البطارية", w: fromBattery, pct: batteryPct, bar: "bg-emerald-500", text: "text-emerald-700", tone: "emerald" as const },
    { label: "الشبكة", w: fromGrid, pct: gridPct, bar: "bg-violet-500", text: "text-violet-700", tone: "violet" as const },
  ];

  const timeZone = history?.timezone || "Asia/Beirut";
  const peakTime = history?.peak ? new Intl.DateTimeFormat("ar-LB-u-nu-latn", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(history.peak.at)) : null;
  const peakPct = history?.peak && history.inverterRatedKw ? Math.round((history.peak.w / (history.inverterRatedKw * 1000)) * 100) : null;

  return (
    <div className="desktop-grid w-full space-y-3 pb-4 text-right" dir="rtl">
      <ConsumptionHero refreshing={refreshing} onRefresh={() => void load(true)} />

      {/* الآن: كم يسحب البيت، ومن أين تأتي هذه الطاقة */}
      <section className="energy-card p-4">
        <span className="block text-xs font-bold text-slate-500">إجمالي سحب المنزل الآن</span>
        {loading && !snapshot ? (
          <Loader2 className="mx-auto my-6 h-10 w-10 animate-spin text-sky-500" aria-label="جاري تحميل القراءة" />
        ) : !snapshot ? (
          // No reading is not "your house uses nothing": say so instead of 0 W.
          <>
            <span className="mt-2 block text-4xl font-black tracking-tight text-slate-300">—</span>
            <span className="mt-2 block text-xs font-bold text-amber-700">لا توجد قراءة حية الآن. تحقق من اتصال الدنجل أو حاول التحديث.</span>
          </>
        ) : (
          <>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
              <span className={"text-4xl font-black leading-none tracking-tight " + toneText}><bdi dir="ltr">{homeW.toLocaleString("en-US")}</bdi> <small className="text-base">واط</small></span>
              <span className="flex items-center gap-1.5">
                <span className={"text-sm font-black " + toneText}><bdi dir="ltr">{homeKw.toFixed(2)} kW</bdi></span>
                <AmpPill tone="sky" amps={acAmps(homeW)} />
              </span>
            </div>

            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              {sources.map((source) => source.w > 0 && <div key={source.label} className={source.bar} style={{ width: `${source.pct}%` }} />)}
            </div>
            <ul className="mt-3 divide-y divide-slate-100" aria-label="من أين يأتي استهلاكك الآن">
              {sources.map((source) => (
                <li key={source.label} className="flex items-center gap-2 py-2">
                  <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + source.bar} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm font-bold text-slate-700">{source.label}</span>
                  <span className="text-xs font-semibold text-slate-400"><bdi dir="ltr">{Math.round(source.w).toLocaleString("en-US")}</bdi> واط</span>
                  <AmpPill tone={source.tone} amps={acAmps(source.w)} muted={source.w <= 0} />
                  <span className={"w-11 text-left text-sm font-black " + source.text}><bdi dir="ltr">{source.pct}%</bdi></span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* اليوم: الاستهلاك وأعلى حمل في بطاقة واحدة */}
      <section className="energy-card p-4">
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-100">
          <div className="pl-3">
            <div className="text-[11px] font-bold text-slate-500">استهلاك اليوم</div>
            <div className="mt-1 whitespace-nowrap text-xl font-black leading-7 text-sky-700"><bdi dir="ltr">{snapshot?.todayHomeUsageKWh !== undefined ? snapshot.todayHomeUsageKWh.toFixed(1) : "—"}<small className="text-xs text-slate-500"> kWh</small></bdi></div>
            <div className="mt-1.5 text-[11px] font-semibold text-slate-400">منذ منتصف الليل</div>
          </div>
          <div className="pr-3">
            <div className="text-[11px] font-bold text-slate-500">أعلى حمل اليوم</div>
            <div className="mt-1 whitespace-nowrap text-xl font-black leading-7 text-sky-700"><bdi dir="ltr">{history?.peak ? (history.peak.w / 1000).toFixed(2) : "—"}<small className="text-xs text-slate-500"> kW</small></bdi></div>
            <div className="mt-1.5"><AmpPill tone="sky" amps={history?.peak ? acAmps(history.peak.w) : null} /></div>
            <div className="mt-1.5 text-[11px] font-semibold text-slate-400">{history?.peak ? <>{peakTime}{peakPct !== null && <> · <bdi dir="ltr">{peakPct}%</bdi> من الإنفرتر</>}</> : "لا قراءات كافية بعد"}</div>
          </div>
        </div>
      </section>

      {/* منحنى آخر 24 ساعة */}
      <section className="energy-card space-y-2 p-4">
        <h2 className="text-sm font-black text-slate-900">آخر 24 ساعة</h2>
        {history && history.points.length >= 2 ? (
          <>
            <HomeSourceSplit points={history.points} now={Date.now()} />
            <div className="border-t border-slate-100 pt-3">
              <LoadChart points={history.points} timeZone={timeZone} now={Date.now()} />
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-xs font-semibold text-slate-400">يظهر المنحنى بعد تجمّع قراءات كافية (نحو ساعة من الاستخدام).</p>
        )}
      </section>
    </div>
  );
}
