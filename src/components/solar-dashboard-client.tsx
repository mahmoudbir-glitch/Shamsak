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

      {/* اختصار إلى توقعات الليلة والغد في تبويب الطاقة */}
      <Link href="/energy" className="energy-card flex items-center gap-3 p-4 transition hover:border-amber-200 hover:shadow-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><Moon className="h-5 w-5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-slate-900">الليلة والغد</span>
          <span className="block text-xs font-semibold text-slate-500">هل تكفي البطارية حتى الصباح؟ وأفضل وقت لاستخدام الشمس.</span>
        </span>
        <ChevronLeft className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
      </Link>
    </div>
  );
}
