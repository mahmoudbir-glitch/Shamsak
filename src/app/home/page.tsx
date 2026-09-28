"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Activity, Home, Loader2, RefreshCw, ShieldCheck, WifiOff, Zap } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { loadTone, semanticBg, semanticBorder, semanticIcon, semanticText } from "@/lib/energy";

const REFRESH_MS = 15_000;

function formatEnergy(value?: number) {
  return value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(1);
}

export default function HomeConsumptionPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/telemetry", { cache: "no-store" });
      if (!response.ok) throw new Error("telemetry_unavailable");
      const data = (await response.json()) as EnergySnapshot;
      if (data.source !== "live") throw new Error("not_live");
      setSnapshot(data);
      setIsLive(true);
      setError(null);
    } catch {
      setIsLive(false);
      setError("تعذر الوصول إلى بيانات الإنفرتر الحية");
      // Keep the last valid reading visible instead of replacing it with demo values.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const solarKw = (snapshot?.solarPowerW ?? 0) / 1000;
  const homeW = Math.max(0, snapshot?.homePowerW ?? 0);
  const batterySoc = snapshot?.batterySoc ?? 0;
  const updated = snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString("ar-LB", { hour: "2-digit", minute: "2-digit" }) : undefined;
  const homeKw = homeW / 1000;
  const tone = loadTone(homeKw);
  const toneText = semanticText[tone];
  const toneIcon = semanticIcon[tone];
  const toneBg = semanticBg[tone];
  const toneBorder = semanticBorder[tone];

  return (
    <div className="w-full space-y-4 rounded-[2rem] bg-gradient-to-b from-sky-50/80 via-white/40 to-white/20 p-2 text-right sm:p-3" dir="rtl">
      <section className="mb-4 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.07)]">
        <div className="relative overflow-hidden px-5 pb-5 pt-5 sm:px-6">
          <div className="pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full bg-amber-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-0 h-44 w-44 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <Zap size={19} fill="currentColor" />
                </span>
                <span className="text-xs font-black text-slate-500">لوحة الطاقة</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">حالة منزلك الآن</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">نظرة سريعة على إنتاج الشمس، استهلاك المنزل والبطارية.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} aria-label="تحديث بيانات الطاقة" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-amber-50 px-3 py-3"><div className="text-[10px] font-bold text-amber-700/70">الشمس الآن</div><div className="mt-1 text-xl font-black text-amber-600">{formatEnergy(solarKw)} <span className="text-[10px]">kW</span></div></div>
            <div className="rounded-2xl bg-sky-50 px-3 py-3"><div className="text-[10px] font-bold text-sky-700/70">استهلاك المنزل</div><div className="mt-1 text-xl font-black text-sky-600">{formatEnergy(homeKw)} <span className="text-[10px]">kW</span></div></div>
            <div className="rounded-2xl bg-emerald-50 px-3 py-3"><div className="text-[10px] font-bold text-emerald-700/70">البطارية</div><div className="mt-1 text-xl font-black text-emerald-600">{batterySoc.toFixed(0)}<span className="text-sm">%</span></div></div>
          </div>
          <div className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              {isLive ? <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Activity size={16} /></span> : <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-slate-500"><WifiOff size={16} /></span>}
              <div className="min-w-0">
                <div className={isLive ? "text-xs font-black text-emerald-700" : "text-xs font-black text-slate-600"}>{isLive ? "البيانات الحية متصلة" : "بانتظار البيانات الحية"}</div>
                <div className="truncate text-[10px] font-semibold text-slate-400">{updated ? `آخر قراءة ${updated}` : "لم تصل قراءة بعد"}</div>
              </div>
            </div>
            {isLive && <div className="flex shrink-0 items-center gap-1 text-[10px] font-black text-emerald-600"><ShieldCheck size={14} />مباشر</div>}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 energy-card p-5">
        <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950">
          <Home size={28} className={toneIcon} aria-hidden="true" />
          استهلاك أحمال المنزل
        </h1>
        <span className={"rounded-full border px-3 py-2 text-xs font-black " + toneBorder + " " + toneBg + " " + toneText}>
          {snapshot?.source === "live" ? "مباشر" : "بانتظار قراءة حية"}
        </span>
      </div>

      <div className="energy-card p-5 text-center">
        <span className="block text-base font-semibold text-slate-400">إجمالي سحب المنزل الآن</span>
        {loading && !snapshot ? (
          <Loader2 className="mx-auto mt-5 h-10 w-10 animate-spin text-blue-500" aria-label="جاري تحميل القراءة" />
        ) : (
          <>
            <span className={"mt-2 block text-4xl font-black tracking-tight sm:text-5xl " + toneText}>{homeW.toLocaleString("ar-LB")} واط</span>
            <span className={"mt-1 block text-sm font-bold " + toneText}>{homeKw.toFixed(2)} kW</span>
          </>
        )}
      </div>

      <section className="energy-card p-5">
        <h2 className="text-lg font-black text-slate-950">📋 حالة الأحمال</h2>
        <div className="mt-4 rounded-xl bg-sky-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-semibold text-slate-600">إجمالي استهلاك المنزل</span>
            <strong className={"text-lg font-black " + toneText}>{homeKw.toFixed(2)} kW</strong>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            لا يتم اختلاق استهلاك منفصل للثلاجة أو الإنارة أو أي جهاز. التفصيل الفردي يحتاج حساسات أحمال مستقلة.
          </p>
        </div>
      </section>

      {!snapshot && !loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base font-bold text-amber-800">
          ⚠️ لا توجد قراءة حية متاحة حاليًا.
        </div>
      )}
    </div>
  );
}
