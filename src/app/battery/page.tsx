"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BatteryCharging, Loader2 } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel } from "@/lib/energy";

const REFRESH_MS = 15_000;

export default function BatteryPage() {
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

  const soc = Math.min(100, Math.max(0, snapshot?.batterySoc ?? 0));
  const powerW = snapshot?.batteryPowerW ?? 0;
  const voltage = snapshot?.batteryVoltage;
  const state = batteryState(powerW);

  return (
    <div className="w-full space-y-5 text-right" dir="rtl">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-emerald-600">
          <BatteryCharging size={28} aria-hidden="true" />
          حالة البطارية
        </h1>
        <span className="rounded-full bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
          {snapshot?.source === "live" ? "مباشر" : "بانتظار قراءة حية"}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
        <span className="block text-base font-semibold text-slate-400">نسبة الشحن الحالية (SOC)</span>
        {loading && !snapshot ? (
          <Loader2 className="mx-auto mt-5 h-10 w-10 animate-spin text-emerald-500" aria-label="جاري تحميل القراءة" />
        ) : (
          <>
            <span className="mb-4 mt-1 block text-5xl font-black text-emerald-600">{Math.round(soc)}%</span>
            <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: soc + "%" }} />
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-base">
          <span className="text-slate-500">حالة التشغيل</span>
          <span className="font-black text-slate-800">{batteryStateLabel(state)} • {Math.abs(powerW).toLocaleString("ar-LB")} واط</span>
        </div>
        <div className="flex items-center justify-between text-base">
          <span className="text-slate-500">جهد البطارية</span>
          <span className="font-black text-slate-800">{voltage != null ? voltage.toFixed(1) + " فولت" : "—"}</span>
        </div>
        <div className="flex items-center justify-between text-base">
          <span className="text-slate-500">حرارة البطارية</span>
          <span className="font-black text-slate-800">
            {snapshot?.batteryTemperature != null ? snapshot.batteryTemperature.toFixed(1) + "°م" : "—"}
          </span>
        </div>
      </div>

      {!snapshot && !loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base font-bold text-amber-800">
          ⚠️ لا توجد قراءة حية متاحة حاليًا.
        </div>
      )}
    </div>
  );
}
