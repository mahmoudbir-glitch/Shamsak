"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { CloudSun } from 'lucide-react';
import { EnergyFlow } from '@/components/energy-flow';
import type { EnergySnapshot } from '@/lib/energy';

const REFRESH_MS = 15_000;

function formatUpdated(timestamp?: string) {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString('ar-LB', { hour: '2-digit', minute: '2-digit' });
}

function formatEnergy(value?: number) {
  return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(1);
}

export default function SolarDashboardClient() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, []);

  useEffect(() => {
    void loadTelemetry();
    const timer = window.setInterval(() => void loadTelemetry(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadTelemetry]);

  const solarKw = (snapshot?.solarPowerW ?? 0) / 1000;
  const homeKw = (snapshot?.homePowerW ?? 0) / 1000;
  const batterySoc = snapshot?.batterySoc ?? 0;
  const updated = snapshot ? formatUpdated(snapshot.timestamp) : undefined;

  return (
    <div className="w-full text-right" dir="rtl">
      <EnergyFlow
        solarKw={solarKw}
        homeKw={homeKw}
        gridKw={(snapshot?.gridPowerW ?? 0) / 1000}
        batteryKw={(snapshot?.batteryPowerW ?? 0) / 1000}
        batteryPercentage={batterySoc}
        gridConnected={snapshot?.gridConnected ?? false}
        todayProductionKWh={snapshot?.todayProductionKWh}
        todayHomeUsageKWh={snapshot?.todayHomeUsageKWh}
        todayGridSavings={snapshot?.todayGridSavings}
        isLive={isLive}
        lastUpdated={snapshot ? formatUpdated(snapshot.timestamp) : undefined}
      />

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-right text-xs font-bold leading-5 text-amber-900">
          <CloudSun className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <div>
            <div>{error}</div>
            <div className="mt-0.5 font-semibold text-amber-800/75">لن نعرض أرقامًا تجريبية بدل بياناتك الحقيقية.</div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-center text-[11px] font-semibold leading-5 text-slate-500 shadow-sm">
        التفاصيل المتقدمة لكفاية الليل والتوقعات موجودة في تبويب <span className="font-black text-slate-700">الطاقة</span>.
      </div>
    </div>
  );
}
