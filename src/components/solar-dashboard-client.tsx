"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Moon } from "lucide-react";
import { EnergyFlow } from "@/components/energy-flow";
import type { EnergySnapshot } from "@/lib/energy";

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
    const timer = window.setInterval(() => void loadTelemetry(), REFRESH_MS);
    return () => window.clearInterval(timer);
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
        todayProductionKWh={snapshot?.todayProductionKWh}
        todayHomeUsageKWh={snapshot?.todayHomeUsageKWh}
        todayGridSavings={snapshot?.todayGridSavings}
        isLive={isLive}
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
    </div>
  );
}
