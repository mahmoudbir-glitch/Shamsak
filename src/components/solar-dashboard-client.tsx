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

export default function SolarDashboardClient() {
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

  return (
    <div className="w-full overflow-x-hidden rounded-[2rem] bg-gradient-to-b from-sky-50/70 via-white/40 to-amber-50/20 p-2 text-right text-slate-800 sm:p-3" dir="rtl">
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
        lastUpdated={snapshot ? formatUpdated(snapshot.timestamp) : undefined}
      />

      <div className="mx-auto mt-5 flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-sky-100/80 bg-white/95 px-4 py-4 shadow-sm">
        <div className={isLive ? "text-sm font-extrabold text-emerald-600" : "text-sm font-extrabold text-amber-600"}>
          {isLive ? '● البيانات الحية متصلة' : '● غير متصل بالبيانات الحية'}
        </div>
        <button
          onClick={() => void loadTelemetry()}
          disabled={loading}
          className="rounded-xl px-3 py-2 text-sm font-extrabold text-blue-600 transition active:scale-95 hover:bg-blue-50 disabled:opacity-50"
        >
          {loading ? 'جاري التحديث…' : 'تحديث الآن'}
        </button>
      </div>

      {error && (
        <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
          ⚠️ {error}. لا يتم عرض أرقام DEMO على أنها بيانات حقيقية.
        </div>
      )}

      <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-semibold leading-6 text-sky-900">
        <strong className="font-black">ملاحظة:</strong> بيانات الصفحة الرئيسية هنا هي قراءات الإنفرتر الحية فقط. تفاصيل كفاية الليل والتوقعات موجودة في تبويب الطاقة.
      </div>
    </div>
  );
}
