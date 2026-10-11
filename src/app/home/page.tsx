"use client";

import { HomeSourceSplit } from "@/components/energy-split";
import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, Home, Loader2, RefreshCw } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { LoadChart, type LoadPoint } from "@/components/load-chart";
import { homeText, acAmps, acAmpHours } from "@/lib/energy";
import { AmpPill } from "@/components/amp-pill";
import { IntelligentEnergyCard } from "@/components/intelligent-energy-card";
import { SmartEnergyAssistant } from "@/components/smart-energy-assistant";
import { startVisiblePolling } from "@/lib/visible-polling";

const REFRESH_MS = 15_000;
const HISTORY_REFRESH_MS = 5 * 60_000;

type History = { points: LoadPoint[]; peak: { w: number; at: string } | null; inverterRatedKw: number | null; timezone: string };

type CollapsibleCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

function CollapsibleCard({ title, subtitle, children, defaultOpen = true, className = "" }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)] ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right transition hover:bg-slate-50/80 active:bg-slate-100/70"
      >
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-900">{title}</span>
          {subtitle && <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">{subtitle}</span>}
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true">
          <ChevronDown size={17} />
        </span>
      </button>
      {open && <div className="border-t border-slate-100 p-3">{children}</div>}
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

  const fromSolar = Math.min(homeW, Math.max(0, snapshot?.solarPowerW ?? 0));
  const fromBattery = Math.min(homeW - fromSolar, Math.max(0, -(snapshot?.batteryPowerW ?? 0)));
  const fromGrid = Math.min(Math.max(0, homeW - fromSolar - fromBattery), Math.max(0, snapshot?.gridPowerW ?? 0));
  const served = fromSolar + fromBattery + fromGrid;
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
      <PageHeader
        icon={Home}
        tone="sky"
        eyebrow="شمسك • المنزل"
        title="استهلاك المنزل"
        subtitle="كم يسحب بيتك الآن، ومن أين تأتي الطاقة."
        right={
          <button type="button" onClick={() => void load(true)} disabled={refreshing} aria-label="تحديث البيانات" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50">
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        }
      />

      <CollapsibleCard title="التحليل الذكي" subtitle="قراءة شمسك لحالة المنظومة الآن">
        <IntelligentEnergyCard snapshot={snapshot} />
      </CollapsibleCard>

      <CollapsibleCard title="الاستهلاك الآن" subtitle="القدرة التي يسحبها المنزل حالياً">
        <div className="rounded-[20px] bg-slate-50/80 p-5 text-center">
          <span className="block text-sm font-semibold text-slate-400">إجمالي سحب المنزل الآن</span>
          {loading && !snapshot ? (
            <Loader2 className="mx-auto mt-5 h-10 w-10 animate-spin text-sky-500" aria-label="جاري تحميل القراءة" />
          ) : !snapshot ? (
            <>
              <span className="mt-2 block text-4xl font-black tracking-tight text-slate-300">—</span>
              <span className="mt-2 block text-xs font-bold text-amber-700">لا توجد قراءة حية الآن. تحقق من اتصال الدنجل أو حاول التحديث.</span>
            </>
          ) : (
            <>
              <span className={"mt-2 block text-4xl font-black tracking-tight sm:text-5xl " + toneText}>{homeW.toLocaleString("en-US")} واط</span>
              <span className={"mt-1 block text-sm font-bold " + toneText}><bdi dir="ltr">{homeKw.toFixed(2)} kW</bdi></span>
              <span className="mt-2 block"><AmpPill tone="sky" amps={acAmps(homeW)} /></span>
            </>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="مصادر الطاقة" subtitle="من أين يأتي استهلاك المنزل الآن">
        <div className="space-y-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            {sources.map((source) => source.w > 0 && <div key={source.label} className={source.bar} style={{ width: `${source.pct}%` }} />)}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {sources.map((source) => (
              <div key={source.label} className="rounded-2xl bg-slate-50/80 px-2 py-2.5">
                <div className="text-[11px] font-bold text-slate-500">{source.label}</div>
                <div className={"text-base font-black " + source.text}>{snapshot ? `${source.pct}%` : "—"}</div>
                <div className="text-[11px] font-semibold text-slate-400">{snapshot ? `${Math.round(source.w)} واط` : "—"}</div>
                <div className="mt-1.5"><AmpPill tone={source.tone} amps={snapshot ? acAmps(source.w) : null} muted={snapshot ? source.w <= 0 : false} /></div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="مساعد شمسك الذكي" subtitle="اسأل عن البطارية والطاقة والتوقعات" defaultOpen={false}>
        <SmartEnergyAssistant snapshot={snapshot} />
      </CollapsibleCard>

      <div className="grid auto-rows-fr grid-cols-2 gap-3">
        <StatTile card tone="sky" label="استهلاك اليوم" value={snapshot?.todayHomeUsageKWh !== undefined ? snapshot.todayHomeUsageKWh.toFixed(1) : "—"} unit="kWh" ampTone="sky" ampUnit="Ah" amps={acAmpHours(snapshot?.todayHomeUsageKWh)} hint="منذ منتصف الليل" />
        <StatTile card tone="sky" label="أعلى حمل اليوم" value={history?.peak ? (history.peak.w / 1000).toFixed(2) : "—"} unit="kW" ampTone="sky" amps={history?.peak ? acAmps(history.peak.w) : null} hint={history?.peak ? <>{peakTime}{peakPct !== null && <> · <bdi dir="ltr">{peakPct}%</bdi> من الإنفرتر</>}</> : undefined} />
      </div>

      <CollapsibleCard title="آخر 24 ساعة" subtitle="توزيع الحمل والاعتماد على مصادر الطاقة" defaultOpen={false}>
        {history && history.points.length >= 2 ? (
          <>
            <HomeSourceSplit points={history.points} now={Date.now()} />
            <div className="mt-3 border-t border-slate-100 pt-3">
              <LoadChart points={history.points} timeZone={timeZone} now={Date.now()} />
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-xs font-semibold text-slate-400">يظهر المنحنى بعد تجمّع قراءات كافية (نحو ساعة من الاستخدام).</p>
        )}
      </CollapsibleCard>
    </div>
  );
}
