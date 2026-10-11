"use client";

import React, { useCallback, useEffect, useState } from "react";
import { EnergyFlow } from "@/components/energy-flow";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { TodaySummary } from "@/components/dashboard/today-summary";
import { NightCard } from "@/components/dashboard/night-card";
import { InverterStatusCard } from "@/components/dashboard/inverter-status-card";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryAmps, AC_VOLTS } from "@/lib/energy";
import { startVisiblePolling } from "@/lib/visible-polling";

const REFRESH_MS = 15_000;

/** الرئيسية = «الآن»: مخطط التدفق وأرقام اليوم، والحالة في الشريط العلوي الموحّد. */
export default function SolarDashboardClient() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [battery, setBattery] = useState<{ capacityWh: number; reservePct: number; nominal?: number } | null>(null);

  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.batteryCapacityWh) setBattery({ capacityWh: data.batteryCapacityWh, reservePct: data.batteryMinReservePct ?? 20, nominal: data.batteryNominalVoltage }); })
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
    return `بالحمل الحالي (${Math.round(load)} واط ≈ ${(load / AC_VOLTS).toFixed(1)} أمبير) تكفي ${shown} حتى حد الاحتياطي ${battery.reservePct}%.`;
  })();

  const hasInverterStatus = Boolean(snapshot && (snapshot.operatingMode || snapshot.inverterTemperature !== undefined));

  return (
    <div className="grid w-full grid-cols-1 gap-5 text-right lg:grid-cols-12 lg:gap-6" dir="rtl">
      <section className="lg:col-span-12" aria-labelledby="home-today">
        <SectionHeading index="01" title="ملخص اليوم" hint="منذ منتصف الليل" id="home-today" />
        <TodaySummary
          productionKWh={snapshot?.todayProductionKWh}
          homeUsageKWh={snapshot?.todayHomeUsageKWh}
          savings={snapshot?.todayGridSavings}
          currencyPrefix={snapshot?.currency ? `${snapshot.currency} ` : undefined}
        />
      </section>

      <section className="lg:col-span-7" aria-labelledby="home-flow">
        <SectionHeading index="02" title="تدفق الطاقة" hint="مباشر" id="home-flow" />
        <EnergyFlow
          showTodaySummary={false}
          solarKw={(snapshot?.solarPowerW ?? 0) / 1000}
          homeKw={(snapshot?.homePowerW ?? 0) / 1000}
          gridKw={(snapshot?.gridPowerW ?? 0) / 1000}
          batteryKw={(snapshot?.batteryPowerW ?? 0) / 1000}
          batteryPercentage={snapshot?.batterySoc ?? Number.NaN}
          gridConnected={snapshot?.gridConnected ?? null}
          gridVoltage={snapshot?.gridVoltage}
          inverterMode={snapshot?.operatingMode}
          todayProductionKWh={snapshot?.todayProductionKWh}
          todayHomeUsageKWh={snapshot?.todayHomeUsageKWh}
          todayGridSavings={snapshot?.todayGridSavings}
          isLive={isLive}
          batteryAmps={batteryAmps(snapshot, battery?.nominal)}
          savingsCurrency={snapshot?.currency ? `${snapshot.currency} ` : undefined}
        />
      </section>

      {/* On a computer these sections sit beside the flow diagram. */}
      <div className="flex flex-col gap-5 lg:col-span-5 lg:gap-6">
        <section aria-labelledby="home-night">
          <SectionHeading index="03" title="الليلة" hint="تقدير البطارية" id="home-night" />
          <NightCard text={nightText} />
        </section>

        {snapshot && hasInverterStatus && (
          <section aria-labelledby="home-inverter">
            <SectionHeading index="04" title="الإنفرتر" hint="كما يرسله الجهاز" id="home-inverter" />
            <InverterStatusCard snapshot={snapshot} />
          </section>
        )}
      </div>
    </div>
  );
}
