"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Home, Loader2, RefreshCw } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { PageHeader } from "@/components/page-header";
import { loadTone, semanticText } from "@/lib/energy";

const REFRESH_MS = 15_000;

export default function HomeConsumptionPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
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
    } catch {
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

  const homeW = Math.max(0, snapshot?.homePowerW ?? 0);
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
        subtitle="كم يسحب بيتك الآن، ومن أين تأتي الطاقة."
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
            <span className={"mt-2 block text-4xl font-black tracking-tight sm:text-5xl " + toneText}>{homeW.toLocaleString("ar-LB-u-nu-latn")} واط</span>
            <span className={"mt-1 block text-sm font-bold " + toneText}>{homeKw.toFixed(2)} kW</span>
          </>
        )}
      </section>

      {/* ما لا تعرضه الرئيسية: استهلاك اليوم، وكم من الحمل تغطيه الشمس الآن */}
      <div className="grid grid-cols-2 gap-3">
        <div className="energy-card p-4">
          <div className="text-[11px] font-bold text-slate-500">استهلاك اليوم</div>
          <div className="mt-1 text-xl font-black text-sky-600">{snapshot?.todayHomeUsageKWh !== undefined ? snapshot.todayHomeUsageKWh.toFixed(1) : "—"} <span className="text-[11px]">ك.و.س</span></div>
        </div>
        <div className="energy-card p-4">
          <div className="text-[11px] font-bold text-slate-500">تغطية الشمس للحمل الآن</div>
          <div className="mt-1 text-xl font-black text-amber-600">{homeW > 0 ? Math.round(Math.min(1, (snapshot?.solarPowerW ?? 0) / homeW) * 100) : 0}%</div>
        </div>
      </div>

      <p className="px-1 text-[11px] font-semibold leading-5 text-slate-400">تفصيل كل غرفة أو جهاز يحتاج حساسات أحمال مستقلة، ولا نعرض أرقاماً مختلقة.</p>
    </div>
  );
}
