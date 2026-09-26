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
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 pb-24 text-right relative overflow-x-hidden" dir="rtl">
      <div className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm mb-4 relative z-20">
        <h1 className="text-base font-black text-amber-500">شمسك ☀️</h1>
        <button
          onClick={() => window.location.href = '/settings'}
          className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-xl font-bold border border-slate-200"
        >
          الإعدادات
        </button>
      </div>

      <div className="mb-4">
        <EnergyFlow
          solarKw={solarKw}
          homeKw={homeKw}
          gridKw={gridKw}
          batteryKw={batteryKw}
          batteryPercentage={batteryPercentage}
          isLive={isLive}
          lastUpdated={snapshot ? formatUpdated(snapshot.timestamp) : undefined}
        />
      </div>

      <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3 mb-4 shadow-sm text-xs">
        <div className={isLive ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
          {isLive ? '● البيانات الحية متصلة' : '● غير متصل بالبيانات الحية'}
        </div>
        <button
          onClick={() => void loadTelemetry()}
          disabled={loading}
          className="text-blue-600 font-bold disabled:opacity-50"
        >
          {loading ? 'جاري التحديث…' : 'تحديث الآن'}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs font-bold text-amber-800">
          ⚠️ {error}. لا يتم عرض أرقام DEMO على أنها بيانات حقيقية.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 bg-white border border-slate-100 rounded-2xl p-3 mb-4 text-center shadow-sm text-[9px] font-bold text-slate-400">
        <div>
          <span className="block mb-1 text-slate-400">DAY'S PRODUCTION</span>
          <span className="text-xs font-black text-amber-600">
            {snapshot?.todayProductionKWh !== undefined ? `${snapshot.todayProductionKWh.toFixed(1)} kWh` : '—'}
          </span>
        </div>
        <div className="border-x border-slate-100">
          <span className="block mb-1 text-slate-400">HOME USAGE</span>
          <span className="text-xs font-black text-blue-600">
            {snapshot?.todayHomeUsageKWh !== undefined ? `${snapshot.todayHomeUsageKWh.toFixed(1)} kWh` : '—'}
          </span>
        </div>
        <div>
          <span className="block mb-1 text-slate-400">GRID SAVINGS</span>
          <span className="text-xs font-black text-emerald-600">
            {snapshot?.todayGridSavings !== undefined ? `$${snapshot.todayGridSavings.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-slate-700 text-xs mb-2">🌙 صمود البطارية الجاري ليلاً</h3>
        {!snapshot ? (
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-bold text-slate-500">
            بانتظار أول قراءة حية…
          </div>
        ) : isBatteryEnough ? (
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs font-bold text-emerald-800">
            ✓ تكفي حتى الصباح • صباحاً نحو {estimatedSocAtSunrise}%
            <p className="text-[10px] font-normal text-slate-500 mt-1">
              متبقي في مخزون البطارية حوالي {hoursRemaining} ساعة
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs font-bold text-amber-800">
            ⚠️ قد لا تكفي حتى الصباح بناءً على الاستهلاك الحالي
            <p className="text-[10px] font-normal text-slate-500 mt-1">
              متبقي في مخزون البطارية حوالي {hoursRemaining} ساعة فقط قبل حد الأمان
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-3 text-[10px] text-slate-400 z-50 rounded-t-2xl shadow-md">
        <div className="text-amber-500 font-bold" onClick={() => window.location.href = '/'}>📊 الرئيسية</div>
        <div className="opacity-60" onClick={() => window.location.href = '/home'}>🏠 المنزل</div>
        <div className="opacity-60" onClick={() => window.location.href = '/battery'}>🔋 البطارية</div>
        <div className="opacity-60" onClick={() => window.location.href = '/energy'}>☀️ الطاقة</div>
        <div className="opacity-60" onClick={() => window.location.href = '/money'}>💰 المال</div>
      </div>
    </div>
  );
}
