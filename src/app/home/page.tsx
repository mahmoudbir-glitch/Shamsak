"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Activity, Home, Loader2, RefreshCw, WifiOff } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { PageHeader } from "@/components/page-header";
import { loadTone, semanticText } from "@/lib/energy";

const REFRESH_MS = 15_000;

function formatEnergy(value?: number) {
  return value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(1);
}

export default function HomeConsumptionPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/telemetry", { cache: "no-store" });
      if (!response.ok) throw new Error("telemetry_unavailable");
      const data = (await response.json()) as EnergySnapshot;
      if (data.source !== "live") throw new Error("not_live");
      setSnapshot(data);
      setIsLive(true);
    } catch {
      setIsLive(false);
      // Keep the last valid reading visible instead of replacing it with demo values.
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
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

  return (
    <div className="w-full space-y-3 pb-4 text-right" dir="rtl">
      <PageHeader
        icon={Home}
        tone="sky"
        eyebrow="شمسك • المنزل"
        title="استهلاك المنزل"
        subtitle={updated ? `آخر قراءة ${updated}` : "لم تصل قراءة بعد"}
        right={
          <button type="button" onClick={() => void load(true)} disabled={refreshing} aria-label="تحديث البيانات" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50">
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        }
      />

      {/* إجمالي السحب الحالي */}
      <section className="energy-card p-6 text-center">
        <span className="block text-sm font-semibold text-slate-400">إجمالي سحب المنزل الآن</span>
        {loading && !snapshot ? (
          <Loader2 className="mx-auto mt-5 h-10 w-10 animate-spin text-sky-500" aria-label="جاري تحميل القراءة" />
        ) : (
          <>
            <span className={"mt-2 block text-4xl font-black tracking-tight sm:text-5xl " + toneText}>{homeW.toLocaleString("ar-LB")} واط</span>
            <span className={"mt-1 block text-sm font-bold " + toneText}>{homeKw.toFixed(2)} kW</span>
          </>
        )}
      </section>

      {/* الإنتاج والبطارية بجانب الاستهلاك */}
      <div className="grid grid-cols-3 gap-3">
        <div className="energy-card p-4"><div className="text-[11px] font-bold text-amber-700/70">الشمس</div><div className="mt-1 text-xl font-black text-amber-600">{formatEnergy(solarKw)} <span className="text-[10px]">kW</span></div></div>
        <div className="energy-card p-4"><div className="text-[11px] font-bold text-sky-700/70">المنزل</div><div className="mt-1 text-xl font-black text-sky-600">{formatEnergy(homeKw)} <span className="text-[10px]">kW</span></div></div>
        <div className="energy-card p-4"><div className="text-[11px] font-bold text-emerald-700/70">البطارية</div><div className="mt-1 text-xl font-black text-emerald-600">{batterySoc.toFixed(0)}<span className="text-sm">%</span></div></div>
      </div>

      <div className="energy-card flex items-center gap-3 p-4">
        <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + (isLive ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500")}>{isLive ? <Activity size={16} /> : <WifiOff size={16} />}</span>
        <div className="min-w-0">
          <div className={"text-xs font-black " + (isLive ? "text-emerald-700" : "text-slate-600")}>{isLive ? "البيانات الحية متصلة" : "بانتظار البيانات الحية"}</div>
          <div className="text-[11px] font-semibold text-slate-400">تفصيل كل غرفة أو جهاز يحتاج حساسات أحمال مستقلة، ولا نعرض أرقاماً مختلقة.</div>
        </div>
      </div>
    </div>
  );
}
