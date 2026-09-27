"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BatteryCharging, Loader2 } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel, batteryTone, semanticBg, semanticBorder, semanticIcon, semanticText } from "@/lib/energy";

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
  const state = batteryState(powerW);\n  const tone = batteryTone(soc);\n  const toneText = semanticText[tone];\n  const toneIcon = semanticIcon[tone];\n  const toneBg = semanticBg[tone];\n  const toneBorder = semanticBorder[tone];

  return (
    <div className="w-full space-y-4 rounded-[2rem] bg-gradient-to-b from-emerald-50/70 via-white/40 to-white/20 p-2 text-right sm:p-3" dir="rtl">
      <div className="flex items-center justify-between gap-3 energy-card p-5">
        <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950">
          <BatteryCharging size={28} className={toneIcon} aria-hidden="true" />
          حالة البطارية
        </h1>
        <span className={"rounded-full border px-3 py-2 text-xs font-black " + toneBorder + " " + toneBg + " " + toneText}>
          {snapshot?.source === "live" ? "مباشر" : "بانتظار قراءة حية"}
        </span>
      </div>

      <div className="energy-card p-5 text-center">
        <span className="block text-sm font-semibold text-slate-400">نسبة الشحن الحالية (SOC)</span>
        {loading && !snapshot ? (
          <Loader2 className="mx-auto mt-5 h-10 w-10 animate-spin text-emerald-500" aria-label="جاري تحميل القراءة" />
        ) : (
          <>
            <span className={"mb-4 mt-1 block text-4xl font-black tracking-tight sm:text-5xl " + toneText}>{Math.round(soc)}%</span>
            <div className={"mb-2 h-4 w-full overflow-hidden rounded-full " + toneBg}>
              <div className={"h-full rounded-full transition-all duration-500 " + toneText.replace("text-", "bg-")} style={{ width: soc + "%" }} />
            </div>
          </>
        )}
      </div>

      <div className="energy-card space-y-3 p-5">
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
