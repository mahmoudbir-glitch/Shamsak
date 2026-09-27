"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";\nimport { loadTone, semanticBg, semanticBorder, semanticIcon, semanticText } from "@/lib/energy";

const REFRESH_MS = 15_000;

export default function HomeConsumptionPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const homeW = Math.max(0, snapshot?.homePowerW ?? 0);
  const homeKw = homeW / 1000;\n  const tone = loadTone(homeKw);\n  const toneText = semanticText[tone];\n  const toneIcon = semanticIcon[tone];\n  const toneBg = semanticBg[tone];\n  const toneBorder = semanticBorder[tone];

  return (
    <div className="w-full space-y-4 rounded-[2rem] bg-gradient-to-b from-sky-50/80 via-white/40 to-white/20 p-2 text-right sm:p-3" dir="rtl">
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
