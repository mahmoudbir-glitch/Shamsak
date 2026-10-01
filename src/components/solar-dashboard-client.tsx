"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Moon } from "lucide-react";
import { EnergyFlow } from "@/components/energy-flow";
import type { EnergySnapshot } from "@/lib/energy";
import { chargerPriorityLabel, inverterModeLabel, outputPriorityLabel, batteryAmps } from "@/lib/energy";
import { startVisiblePolling } from "@/lib/visible-polling";

const REFRESH_MS = 15_000;

/** الرئيسية = «الآن»: مخطط التدفق وأرقام اليوم، والحالة في الشريط العلوي الموحّد. */
export default function SolarDashboardClient() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [battery, setBattery] = useState<{ capacityWh: number; reservePct: number } | null>(null);

  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.batteryCapacityWh) setBattery({ capacityWh: data.batteryCapacityWh, reservePct: data.batteryMinReservePct ?? 20 }); })
      .catch(() => {});
  }, []);

  const loadTelemetry = useCallback(async () => {
    try {
      const response = await fetch("/api/telemetry", { cache: "no-store" });
      if (!response.ok) throw new Error("telemetry_unavailable");
      const data = (await response.json()) as EnergySnapshot;
      if (data.source !== "live") throw new Error("telemetry_not_live");
      setSnapshot(data);
      setIsLive(!data.stale);
    } catch {
      // نُبقي آخر قراءة صحيحة؛ حالة الاتصال يعرضها الشريط العلوي.
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    void loadTelemetry();
    return startVisiblePolling(() => void loadTelemetry(), REFRESH_MS);
  }, [loadTelemetry]);

  // كم ساعة تكفي البطارية حتى حد الاحتياطي بالحمل الحالي (تقدير بسيط).
  const nightText = (() => {
    if (!snapshot || !battery) return "افتح التفاصيل لتقدير كفاية البطارية حتى الصباح.";
    const load = Math.max(snapshot.homePowerW, -snapshot.batteryPowerW, 0);
    if (snapshot.solarPowerW >= load && snapshot.solarPowerW > 50) return "الشمس تغطي الحمل الآن. اضغط لتقدير الليلة القادمة.";
    if (load < 30) return "الحمل شبه متوقف الآن، فالبطارية تكفي بسهولة.";
    const usableWh = (Math.max(0, snapshot.batterySoc - battery.reservePct) / 100) * battery.capacityWh;
    const hours = usableWh / load;
    if (hours <= 0) return "البطارية عند حد الاحتياطي الآن.";
    const shown = hours >= 24 ? "أكثر من 24 ساعة" : `نحو ${hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10} ساعة`;
    return `بالحمل الحالي (${Math.round(load)} واط) تكفي ${shown} حتى حد الاحتياطي ${battery.reservePct}%.`;
  })();

  return (
    <div className="w-full space-y-3 text-right" dir="rtl">
      <EnergyFlow
        solarKw={(snapshot?.solarPowerW ?? 0) / 1000}
        homeKw={(snapshot?.homePowerW ?? 0) / 1000}
        gridKw={(snapshot?.gridPowerW ?? 0) / 1000}
        batteryKw={(snapshot?.batteryPowerW ?? 0) / 1000}
        batteryPercentage={snapshot?.batterySoc ?? 0}
        gridConnected={snapshot?.gridConnected ?? false}
        gridVoltage={snapshot?.gridVoltage}
        inverterMode={snapshot?.operatingMode}
        todayProductionKWh={snapshot?.todayProductionKWh}
        todayHomeUsageKWh={snapshot?.todayHomeUsageKWh}
        todayGridSavings={snapshot?.todayGridSavings}
        isLive={isLive}
        batteryAmps={batteryAmps(snapshot)}
        savingsCurrency={snapshot?.currency ? `${snapshot.currency} ` : undefined}
      />

      {/* الليلة: جواب مباشر من القراءة الحالية، والتفاصيل في قسم الليل بصفحة الطاقة */}
      <Link href="/energy#night" className="energy-card flex items-center gap-3 p-4 transition hover:border-indigo-200 hover:shadow-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><Moon className="h-5 w-5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-slate-900">الليلة: هل تكفي البطارية؟</span>
          <span className="block text-xs font-semibold leading-5 text-slate-500">{nightText}</span>
        </span>
        <ChevronLeft className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
      </Link>

      {/* حالة الإنفرتر كما يرسلها بنفسه */}
      {snapshot && (snapshot.operatingMode || snapshot.inverterTemperature !== undefined) && (
        <section className="energy-card p-4">
          <h2 className="text-sm font-black text-slate-900">حالة الإنفرتر</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">التشغيل الآن</dt><dd className="font-black text-slate-800">{inverterModeLabel(snapshot.operatingMode)}</dd>
            <dt className="text-slate-500">أولوية المصدر</dt><dd className="font-black text-slate-800">{outputPriorityLabel(snapshot.outputPriority)}</dd>
            <dt className="text-slate-500">شحن البطارية</dt><dd className="font-black text-slate-800">{chargerPriorityLabel(snapshot.chargerPriority)}</dd>
            <dt className="text-slate-500">الحمل من قدرته</dt><dd className="font-black text-slate-800">{snapshot.loadPercent !== undefined ? `${Math.round(snapshot.loadPercent)}%` : "—"}</dd>
            <dt className="text-slate-500">حرارة الإنفرتر</dt><dd className={"font-black " + ((snapshot.inverterTemperature ?? 0) >= 60 ? "text-rose-600" : "text-slate-800")}>{snapshot.inverterTemperature !== undefined ? `${Math.round(snapshot.inverterTemperature)}°م` : "—"}</dd>
            <dt className="text-slate-500">جهد مدخل الشبكة</dt><dd className="font-black text-slate-800">{/off.?grid|battery/i.test(snapshot.operatingMode ?? "") ? "غير مُقاس (منفصل)" : snapshot.gridVoltage !== undefined ? `${Math.round(snapshot.gridVoltage)} V` : "—"}</dd>
          </dl>
        </section>
      )}
    </div>
  );
}
