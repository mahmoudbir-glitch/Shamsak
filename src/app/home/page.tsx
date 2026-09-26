"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";

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
  const homeKw = homeW / 1000;

  return (
    <div className="w-full space-y-5 text-right" dir="rtl">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-blue-600">
          <Home size={28} aria-hidden="true" />
          استهلاك أحمال المنزل
        </h1>
        <span className="rounded-full bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
          {snapshot?.source === "live" ? "مباشر" : "بانتظار قراءة حية"}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
        <span className="block text-base font-semibold text-slate-400">إجمالي سحب المنزل الآن</span>
        {loading && !snapshot ? (
          <Loader2 className="mx-auto mt-5 h-10 w-10 animate-spin text-blue-500" aria-label="جاري تحميل القراءة" />
        ) : (
          <>
            <span className="mt-2 block text-5xl font-black text-blue-600">{homeW.toLocaleString("ar-LB")} واط</span>
            <span className="mt-1 block text-sm font-bold text-slate-400">{homeKw.toFixed(2)} kW</span>
          </>
        )}
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-800">📋 حالة الأحمال</h2>
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-semibold text-slate-600">إجمالي استهلاك المنزل</span>
            <strong className="text-lg font-black text-blue-700">{homeKw.toFixed(2)} kW</strong>
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
