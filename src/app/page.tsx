"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { EnergyFlow } from '@/components/energy-flow';
import type { EnergySnapshot } from '@/lib/energy';

const REFRESH_MS = 15_000;

function formatUpdated(timestamp?: string) {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString('ar-LB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SolarDashboard() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTelemetry = useCallback(async () => {
    try {
      const response = await fetch('/api/telemetry', { cache: 'no-store' });
      if (!response.ok) throw new Error('telemetry_unavailable');

      const data = (await response.json()) as EnergySnapshot;
      if (data.source !== 'live') throw new Error('telemetry_not_live');

      setSnapshot(data);
      setIsLive(true);
      setError(null);
    } catch {
      setIsLive(false);
      setError('تعذر الوصول إلى بيانات الإنفرتر الحية');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTelemetry();
    const timer = window.setInterval(() => void loadTelemetry(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadTelemetry]);

  const solarKw = (snapshot?.solarPowerW ?? 0) / 1000;
  const homeKw = (snapshot?.homePowerW ?? 0) / 1000;
  const gridKw = (snapshot?.gridPowerW ?? 0) / 1000;
  const batteryKw = (snapshot?.batteryPowerW ?? 0) / 1000;
  const batteryPercentage = snapshot?.batterySoc ?? 0;

  const SAFETY_RESERVE = 10;
  const usableSoc = Math.max(0, batteryPercentage - SAFETY_RESERVE);
  const availableWh = 4800 * (usableSoc / 100);
  const currentConsumption = snapshot?.homePowerW && snapshot.homePowerW > 0 ? snapshot.homePowerW : 0;
  const hoursRemaining = currentConsumption > 0
    ? Math.round((availableWh / currentConsumption) * 10) / 10
    : 0;
  const estimatedSocAtSunrise = currentConsumption > 0
    ? Math.max(
        SAFETY_RESERVE,
        Math.round(((4800 * (batteryPercentage / 100) - currentConsumption * 10) / 4800) * 100),
      )
    : batteryPercentage;
  const isBatteryEnough = hoursRemaining >= 8;

  return (
    <div className="relative w-full overflow-x-hidden text-right text-slate-800" dir="rtl">
      <EnergyFlow
        solarKw={solarKw}
        homeKw={homeKw}
        gridKw={gridKw}
        batteryKw={batteryKw}
        batteryPercentage={batteryPercentage}
        todayProductionKWh={snapshot?.todayProductionKWh}
        todayHomeUsageKWh={snapshot?.todayHomeUsageKWh}
        todayGridSavings={snapshot?.todayGridSavings}
        isLive={isLive}
        lastUpdated={snapshot ? formatUpdated(snapshot.timestamp) : undefined}
      />

      <div className="mx-auto mt-5 flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
        <div className={isLive ? "text-base font-extrabold text-emerald-600" : "text-base font-extrabold text-amber-600"}>
          {isLive ? '● البيانات الحية متصلة' : '● غير متصل بالبيانات الحية'}
        </div>
        <button
          onClick={() => void loadTelemetry()}
          disabled={loading}
          className="rounded-xl px-3 py-2 text-base font-extrabold text-blue-600 transition active:scale-95 hover:bg-blue-50 disabled:opacity-50"
        >
          {loading ? 'جاري التحديث…' : 'تحديث الآن'}
        </button>
      </div>

      {error && (
        <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base font-semibold text-amber-800">
          ⚠️ {error}. لا يتم عرض أرقام DEMO على أنها بيانات حقيقية.
        </div>
      )}

      <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-black text-slate-700">🌙 صمود البطارية الجاري ليلاً</h3>
        {!snapshot ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-base font-semibold text-slate-500">
            بانتظار أول قراءة حية…
          </div>
        ) : isBatteryEnough ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-base font-semibold text-emerald-800">
            ✓ تكفي حتى الصباح • صباحاً نحو {estimatedSocAtSunrise}%
            <p className="mt-1 text-sm font-normal text-slate-500">
              متبقي في مخزون البطارية حوالي {hoursRemaining} ساعة
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base font-semibold text-amber-800">
            ⚠️ قد لا تكفي حتى الصباح بناءً على الاستهلاك الحالي
            <p className="mt-1 text-xs font-normal text-slate-500">
              متبقي في مخزون البطارية حوالي {hoursRemaining} ساعة فقط قبل حد الأمان
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
