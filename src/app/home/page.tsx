"use client";

import { HomeSourceSplit } from "@/components/energy-split";
import React, { useCallback, useEffect, useState } from "react";
import { BatteryCharging, ChevronDown, Home, Loader2, RefreshCw, Sun, Zap } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { LoadChart, type LoadPoint } from "@/components/load-chart";
import { homeText, acAmps } from "@/lib/energy";
import { AmpPill } from "@/components/amp-pill";
import { startVisiblePolling } from "@/lib/visible-polling";
import { IntelligentEnergyCard } from "@/components/intelligent-energy-card";

const REFRESH_MS = 15_000;
const HISTORY_REFRESH_MS = 5 * 60_000;

type History = { points: LoadPoint[]; peak: { w: number; at: string } | null; inverterRatedKw: number | null; timezone: string };
type CollapsibleCardProps = { index: string; title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean; className?: string; accentClass?: string };

function CollapsibleCard({ index, title, subtitle, children, defaultOpen = true, className = "", accentClass = "border-r-sky-400" }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`overflow-hidden rounded-[24px] border border-slate-200/80 border-r-4 ${accentClass} bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)] ${className}`}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-right transition hover:bg-slate-50/80 active:bg-slate-100/70">
        <span className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[10px] font-black tracking-wider text-slate-500 ring-1 ring-inset ring-slate-200/70 ${open ? "bg-slate-100" : ""}`} aria-hidden="true">{index}</span><span className="min-w-0"><span className="block text-sm font-black text-slate-900">{title}</span>{subtitle && <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{subtitle}</span>}</span></span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true"><ChevronDown size={17} /></span>
      </button>
      {open && <div className="border-t border-slate-100 p-2.5">{children}</div>}
    </section>
  );
}

function ConsumptionHero({ snapshot, refreshing, onRefresh }: { snapshot: EnergySnapshot | null; refreshing: boolean; onRefresh: () => void }) {
  const homeW = Math.max(0, snapshot?.homePowerW ?? 0);
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-sky-100 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f4faff_58%,#eef8ff_100%)] p-4 shadow-[0_14px_40px_rgba(14,165,233,0.10)] sm:p-5">
      <div className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-sky-200/30 blur-3xl" /><div className="pointer-events-none absolute -bottom-16 right-8 h-32 w-32 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-sky-600 shadow-sm ring-1 ring-sky-100"><Home size={24} strokeWidth={2.2} /></div><div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">استهلاك المنزل</h1>{snapshot && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> حي</span>}</div><p className="mt-0.5 text-[11px] font-semibold text-slate-500 sm:text-xs">صورة سريعة لاستهلاك بيتك والطاقة المسحوبة</p></div></div><button type="button" onClick={onRefresh} disabled={refreshing} aria-label="تحديث البيانات" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/80 text-slate-500 shadow-sm transition hover:bg-white active:scale-95 disabled:opacity-50"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /></button></div>
      <div className="relative mt-4">
        <div className="rounded-2xl border border-white/80 bg-white/75 p-3 shadow-sm backdrop-blur-sm"><div className="flex items-center gap-2 text-[10px] font-bold text-slate-400"><Zap size={14} className="text-amber-500" /> السحب الآن</div><div className={"mt-1.5 text-xl font-black tracking-tight " + homeText(homeW / 1000)}><bdi dir="ltr">{snapshot ? (homeW / 1000).toFixed(2) : "—"}</bdi> <span className="text-xs font-bold opacity-70">kW</span><span className="mt-1 block"><AmpPill tone="sky" amps={snapshot ? acAmps(homeW) : null} /></span></div></div>
      </div>
    </section>
  );
}

export default function HomeConsumptionPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [history, setHistory] = useState<History | null>(null);
  const loadHistory = useCallback(async () => { try { const response = await fetch("/api/telemetry/history", { cache: "no-store" }); if (response.ok) setHistory((await response.json()) as History); } catch { /* المنحنى اختياري */ } }, []);
  const load = useCallback(async (manual = false) => { if (manual) { setRefreshing(true); void loadHistory(); } try { const response = await fetch("/api/telemetry", { cache: "no-store" }); if (!response.ok) throw new Error("telemetry_unavailable"); const data = (await response.json()) as EnergySnapshot; if (data.source !== "live") throw new Error("not_live"); setSnapshot(data); } catch { /* إبقاء آخر قراءة صالحة */ } finally { setLoading(false); if (manual) setRefreshing(false); } }, [loadHistory]);
  useEffect(() => { void loadHistory(); return startVisiblePolling(() => void loadHistory(), HISTORY_REFRESH_MS); }, [loadHistory]);
  useEffect(() => { void load(); return startVisiblePolling(() => void load(), REFRESH_MS); }, [load]);
  const homeW = Math.max(0, snapshot?.homePowerW ?? 0); const homeKw = homeW / 1000;
  const fromSolar = Math.min(homeW, Math.max(0, snapshot?.solarPowerW ?? 0)); const fromBattery = Math.min(homeW - fromSolar, Math.max(0, -(snapshot?.batteryPowerW ?? 0))); const fromGrid = Math.min(Math.max(0, homeW - fromSolar - fromBattery), Math.max(0, snapshot?.gridPowerW ?? 0)); const served = fromSolar + fromBattery + fromGrid; const solarPct = served > 0 ? Math.round((fromSolar / served) * 100) : 0; const batteryPct = served > 0 ? Math.min(100 - solarPct, Math.round((fromBattery / served) * 100)) : 0; const gridPct = served > 0 ? 100 - solarPct - batteryPct : 0;
  const sources = [{ label: "الشمس", w: fromSolar, pct: solarPct, bar: "bg-amber-400", text: "text-amber-700", tone: "amber" as const, Icon: Sun }, { label: "البطارية", w: fromBattery, pct: batteryPct, bar: "bg-emerald-500", text: "text-emerald-700", tone: "emerald" as const, Icon: BatteryCharging }, { label: "الشبكة", w: fromGrid, pct: gridPct, bar: "bg-violet-500", text: "text-violet-700", tone: "violet" as const, Icon: Zap }];
  const timeZone = history?.timezone || "Asia/Beirut"; const peakTime = history?.peak ? new Intl.DateTimeFormat("ar-LB-u-nu-latn", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(history.peak.at)) : null; const peakPct = history?.peak && history.inverterRatedKw ? Math.round((history.peak.w / (history.inverterRatedKw * 1000)) * 100) : null; const ratedKw = history?.inverterRatedKw ?? null; const loadPct = ratedKw && ratedKw > 0 ? Math.min(100, Math.round((homeKw / ratedKw) * 100)) : 0; const gauge = snapshot ? Math.max(5, loadPct) : 0;

  return (<div className="desktop-grid w-full space-y-3 pb-4 text-right" dir="rtl">
    <ConsumptionHero snapshot={snapshot} refreshing={refreshing} onRefresh={() => void load(true)} />
    {snapshot && <IntelligentEnergyCard snapshot={snapshot} />}
    <CollapsibleCard index="01" title="الاستهلاك الآن" subtitle="قدرة المنزل ومصادر الطاقة في هذه اللحظة" accentClass="border-r-sky-400">
      <div className="overflow-hidden rounded-[22px] bg-slate-50/80 p-3 text-slate-800 shadow-inner ring-1 ring-inset ring-slate-100 sm:p-4">
        <div className="flex items-center justify-between gap-3 px-1 pb-3"><div><span className="block text-[10px] font-bold text-slate-400">الاستهلاك اللحظي</span><span className="mt-0.5 block text-xs font-black text-slate-800">كم يستهلك المنزل الآن؟</span></div><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 shadow-sm"><span className={`h-1.5 w-1.5 rounded-full ${snapshot ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} /> {snapshot ? "قراءة حية" : "بانتظار القراءة"}</span></div>
        <div className="grid items-center gap-4 md:grid-cols-[minmax(150px,0.72fr)_minmax(0,1.28fr)]">
          <div className="flex justify-center py-2"><div className="relative grid h-40 w-40 place-items-center rounded-full p-[10px] shadow-[0_0_35px_rgba(56,189,248,0.12)]" style={{ background: `conic-gradient(from 220deg, #38bdf8 0%, #34d399 ${gauge}%, #e2e8f0 ${gauge}% 100%)` }}><div className="grid h-full w-full place-items-center rounded-full border border-slate-200 bg-white text-center shadow-inner">{loading && !snapshot ? <Loader2 className="h-8 w-8 animate-spin text-sky-500" aria-label="جاري تحميل القراءة" /> : !snapshot ? <><span className="text-4xl font-black text-slate-300">—</span><span className="mt-[-22px] text-[9px] font-bold text-slate-400">لا توجد قراءة</span></> : <div><span className="block text-3xl font-black tracking-tight text-slate-900"><bdi dir="ltr">{homeKw.toFixed(2)}</bdi></span><span className="mt-0.5 block text-xs font-black text-sky-600"><bdi dir="ltr">kW</bdi></span><span className="mt-1.5 block"><AmpPill tone="sky" amps={acAmps(homeW)} /></span><span className="mt-1 block text-[9px] font-bold text-slate-400">{ratedKw ? `${loadPct}% من قدرة الإنفرتر` : "الحمل الحالي"}</span></div>}</div></div></div>
          <div className="space-y-2.5">{sources.map((source) => { const Icon = source.Icon; return <div key={source.label} className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm"><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-100"><Icon size={17} className={source.label === "الشمس" ? "text-amber-500" : source.label === "البطارية" ? "text-emerald-500" : "text-violet-500"} /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-800">من {source.label}</span><span className="text-xs font-black text-slate-700"><bdi dir="ltr">{snapshot ? `${source.pct}%` : "—"}</bdi></span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={"h-full rounded-full transition-all duration-500 " + source.bar} style={{ width: `${snapshot ? source.pct : 0}%` }} /></div></div><span className="hidden min-w-[58px] text-left text-[10px] font-bold text-slate-400 sm:block"><bdi dir="ltr">{snapshot ? `${Math.round(source.w)} W` : "—"}</bdi></span></div></div>; })}<div className="grid grid-cols-2 gap-2 pt-0.5"><div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><span className="block text-[9px] font-bold text-slate-400">التيار التقريبي</span><span className="mt-0.5 block text-xs font-black text-slate-700"><AmpPill tone="sky" amps={snapshot ? acAmps(homeW) : null} /></span></div><div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><span className="block text-[9px] font-bold text-slate-400">اتجاه الحمل</span><span className="mt-0.5 block text-xs font-black text-emerald-600">{homeW > 50 ? "نشط الآن" : "منخفض"}</span></div></div></div>
        </div>
      </div>
    </CollapsibleCard>
    <CollapsibleCard index="02" title="مصادر الطاقة" subtitle="من أين يأتي استهلاك المنزل الآن" accentClass="border-r-amber-400"><div className="space-y-3"><div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">{sources.map((source) => source.w > 0 && <div key={source.label} className={source.bar} style={{ width: `${source.pct}%` }} />)}</div><div className="grid grid-cols-3 gap-2 text-center">{sources.map((source) => <div key={source.label} className="rounded-2xl bg-slate-50/80 px-2 py-2.5"><div className="text-[11px] font-bold text-slate-500">{source.label}</div><div className={"text-base font-black " + source.text}>{snapshot ? `${source.pct}%` : "—"}</div><div className="text-[11px] font-semibold text-slate-400">{snapshot ? `${Math.round(source.w)} واط` : "—"}</div><div className="mt-1.5"><AmpPill tone={source.tone} amps={snapshot ? acAmps(source.w) : null} muted={snapshot ? source.w <= 0 : false} /></div></div>)}</div></div></CollapsibleCard>
    <CollapsibleCard index="03" title="آخر 24 ساعة" subtitle="توزيع الحمل والاعتماد على مصادر الطاقة" defaultOpen={false} accentClass="border-r-indigo-400">{history && history.points.length >= 2 ? <><HomeSourceSplit points={history.points} now={Date.now()} /><div className="mt-3 border-t border-slate-100 pt-3"><LoadChart points={history.points} timeZone={timeZone} now={Date.now()} /></div></> : <p className="py-6 text-center text-xs font-semibold text-slate-400">يظهر المنحنى بعد تجمّع قراءات كافية (نحو ساعة من الاستخدام).</p>}</CollapsibleCard>
  </div>);
}
