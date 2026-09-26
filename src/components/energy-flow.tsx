'use client';

import React from 'react';
import { BatteryCharging, Home, RadioTower, Sun, Zap } from 'lucide-react';
import { InfoTip } from '@/components/info-tip';

interface EnergyFlowProps {
  solarKw: number;
  homeKw: number;
  gridKw: number;
  batteryKw: number;
  batteryPercentage: number;
  gridConnected?: boolean;
  todayProductionKWh?: number;
  todayHomeUsageKWh?: number;
  todayGridSavings?: number;
  savingsCurrency?: string;
  isLive?: boolean;
  lastUpdated?: string;
}

const FLOW_THRESHOLD = 0.05;

export const EnergyFlow: React.FC<EnergyFlowProps> = ({
  solarKw,
  homeKw,
  gridKw,
  batteryKw,
  batteryPercentage,
  gridConnected = true,
  todayProductionKWh,
  todayHomeUsageKWh,
  todayGridSavings,
  savingsCurrency = '$',
  isLive = false,
  lastUpdated,
}) => {
  const measuredPowers = [solarKw, homeKw, gridKw, batteryKw];
  const hasNonZeroLiveReading = measuredPowers.every(Number.isFinite) && measuredPowers.some((value) => Math.abs(value) > FLOW_THRESHOLD);
  const liveFlowActive = isLive && hasNonZeroLiveReading;

  const solarActive = liveFlowActive && solarKw > FLOW_THRESHOLD;
  const homeActive = liveFlowActive && homeKw > FLOW_THRESHOLD;
  const batteryCharging = liveFlowActive && batteryKw > FLOW_THRESHOLD;
  const batteryDischarging = liveFlowActive && batteryKw < -FLOW_THRESHOLD;
  const gridImporting = liveFlowActive && gridConnected && gridKw > FLOW_THRESHOLD;
  const gridExporting = liveFlowActive && gridConnected && gridKw < -FLOW_THRESHOLD;

  const solarToHome = solarActive && homeActive;
  const activeFlowClass = 'energy-flow-path energy-flow-active';
  const solarToBattery = solarActive && batteryCharging;
  const solarToGrid = solarActive && gridExporting;
  const batteryToHome = batteryDischarging && homeActive;

  const formatKw = (value: number) => Math.abs(value).toFixed(2) + ' kW';
  const formatKwh = (value?: number) => value === undefined ? '—' : value.toFixed(1) + ' kWh';
  const formatSavings = (value?: number) => value === undefined ? '—' : savingsCurrency + value.toFixed(2);

  // One circular energy route surrounds the four system nodes.
  // Each live flow uses a segment of the same circle, so the animated dash
  // and arrowhead always follow the exact circular geometry.
  const solarHomePath = 'M 200 58 A 142 142 0 0 1 342 200';
  const solarBatteryPath = 'M 200 58 A 142 142 0 0 1 200 342';
  const solarGridPath = 'M 200 58 A 142 142 0 0 0 58 200';
  const batteryHomePath = batteryToHome
    ? 'M 200 342 A 142 142 0 0 0 342 200'
    : 'M 342 200 A 142 142 0 0 1 200 342';
  const gridHomePath = gridImporting
    ? 'M 58 200 A 142 142 0 0 0 342 200'
    : 'M 342 200 A 142 142 0 0 0 58 200';

  return (
    <section className="w-full max-w-lg mx-auto overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.09)]" aria-label="مخطط تدفق الطاقة">
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            تدفق الطاقة الآن
          </span>
          <div className="flex items-center gap-2">
            <span className={liveFlowActive ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700' : isLive ? 'rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700' : 'rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700'}>
              {liveFlowActive ? '● مباشر' : isLive ? '● متصل بلا قراءة' : 'غير متصل'}
            </span>
            <InfoTip label="شرح حالة اتصال الإنفرتر" title="حالة الاتصال">
              {liveFlowActive
                ? 'مباشر: توجد قراءة telemetry حية غير صفرية، لذلك يظهر تدفق الطاقة المتحرك.'
                : isLive
                  ? 'متصل، لكن قراءات الطاقة الحالية صفرية أو غير صالحة، لذلك تم إيقاف الحركة.'
                  : 'غير متصل: لا توجد قراءة حية مؤكدة الآن.'}
            </InfoTip>
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-2 aspect-square w-full max-w-lg p-2 sm:p-4">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 400" fill="none" aria-hidden="true">
          <defs>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" /></marker>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" /></marker>
            <marker id="arrow-orange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B" /></marker>
          </defs>
          <circle cx="200" cy="200" r="142" pathLength="100" fill="none" stroke="#E2E8F0" strokeWidth="3.5" strokeLinecap="round" opacity="0.65" />
          <path d={solarHomePath} pathLength="100" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" opacity={solarToHome ? 1 : 0.12} markerEnd="url(#arrow-green)" className={solarToHome ? activeFlowClass : ''} />
          <path d={solarBatteryPath} pathLength="100" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" opacity={solarToBattery ? 1 : 0.12} markerEnd="url(#arrow-green)" className={solarToBattery ? activeFlowClass : ''} />
          <path d={solarGridPath} pathLength="100" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" opacity={solarToGrid ? 1 : 0.12} markerEnd="url(#arrow-green)" className={solarToGrid ? activeFlowClass : ''} />
          <path d={batteryHomePath} pathLength="100" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" opacity={batteryToHome ? 1 : 0.12} markerEnd="url(#arrow-green)" className={batteryToHome ? activeFlowClass : ''} />
          <path d={gridHomePath} pathLength="100" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" opacity={gridConnected && (gridImporting || gridExporting) ? 1 : 0.12} markerEnd="url(#arrow-orange)" className={gridConnected && (gridImporting || gridExporting) ? activeFlowClass : ''} />
          <path d={solarHomePath} pathLength="100" stroke="#3B82F6" strokeWidth="3.5" strokeLinecap="round" opacity={homeActive ? 0.55 : 0.08} markerEnd="url(#arrow-blue)" />
          <circle cx="200" cy="200" r="28" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="20" fill="#FFFBEB" />
        </svg>

        <div className="absolute left-1/2 top-[4%] z-10 w-[30%] min-w-[96px] -translate-x-1/2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-[0_8px_22px_rgba(245,158,11,0.16)] sm:h-[4.5rem] sm:w-[4.5rem]">
            <Sun className="h-9 w-9 text-amber-500" strokeWidth={2.2} />
          </div>
          <div className="mt-1.5 text-[11px] font-black tracking-widest text-slate-400">SOLAR</div>
          <div className="text-sm font-black text-emerald-600 sm:text-base">{formatKw(solarKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">إنتاج حالي</div>
        </div>

        <div className="absolute left-[3%] top-1/2 z-10 w-[27%] min-w-[88px] -translate-y-1/2 text-center">
          <div className={gridConnected ? "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm sm:h-16 sm:w-16" : "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 shadow-sm sm:h-16 sm:w-16"}>
            <RadioTower className={gridConnected ? "h-8 w-8 text-emerald-500" : "h-8 w-8 text-slate-400"} strokeWidth={2.1} />
          </div>
          <div className="mt-1.5 text-[10px] font-black tracking-wide text-slate-400">GRID</div>
          <div className={gridConnected ? "text-sm font-black text-emerald-600 sm:text-base" : "text-sm font-black text-slate-500 sm:text-base"}>
            {gridConnected ? "متصلة" : "مقطوعة"}
          </div>
          <div className="text-[10px] font-bold text-slate-500">{liveFlowActive && gridConnected ? (gridExporting ? "تصدير" : gridImporting ? "سحب" : "متوازنة") : "لا يوجد تدفق"}</div>
        </div>

        <div className="absolute right-[3%] top-1/2 z-10 w-[27%] min-w-[88px] -translate-y-1/2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 shadow-sm sm:h-16 sm:w-16">
            <Home className="h-8 w-8 text-blue-500" strokeWidth={2.1} />
          </div>
          <div className="mt-1.5 text-[10px] font-black tracking-wide text-slate-400">HOME</div>
          <div className="text-sm font-black text-blue-600 sm:text-base">{formatKw(homeKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">استهلاك حالي</div>
        </div>

        <div className="absolute bottom-[4%] left-1/2 z-10 w-[32%] min-w-[106px] -translate-x-1/2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300 bg-white shadow-[0_8px_22px_rgba(16,185,129,0.14)] sm:h-[4.5rem] sm:w-[4.5rem]">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-emerald-400">
              <BatteryCharging className="absolute h-5 w-5 -translate-y-3 text-emerald-500" strokeWidth={2.3} />
              <span className="mt-2 text-sm font-black text-slate-800">{batteryPercentage.toFixed(0)}%</span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] font-black tracking-wide text-slate-400">BATTERY</div>
          <div className="text-sm font-black text-emerald-600 sm:text-base">{formatKw(batteryKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">{batteryCharging ? 'تشحن' : batteryDischarging ? 'تفرغ' : 'ثابتة'}</div>
        </div>

        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-white shadow-md sm:h-12 sm:w-12">
            <Zap className="h-5 w-5 text-amber-500 sm:h-6 sm:w-6" fill="currentColor" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      {!liveFlowActive && <div className="mx-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs font-bold text-amber-800 sm:mx-6">⚠️ لا توجد قراءة حية متاحة حاليًا. تحقّق من اتصال الإنفرتر وإرسال بيانات القياس.</div>}

      <div className="border-t border-slate-100 bg-slate-50/70 px-3 py-4 sm:px-5">
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200 text-center">
          <div className="px-2"><div className="text-[9px] font-black tracking-wide text-slate-400 sm:text-[10px]">TODAY'S PRODUCTION</div><div className="mt-1 text-base font-black text-emerald-600 sm:text-lg">{formatKwh(todayProductionKWh)}</div><div className="text-[10px] font-bold text-slate-500">إنتاج اليوم</div></div>
          <div className="px-2"><div className="text-[9px] font-black tracking-wide text-slate-400 sm:text-[10px]">HOME USAGE</div><div className="mt-1 text-base font-black text-blue-600 sm:text-lg">{formatKwh(todayHomeUsageKWh)}</div><div className="text-[10px] font-bold text-slate-500">استهلاك المنزل</div></div>
          <div className="px-2"><div className="text-[9px] font-black tracking-wide text-slate-400 sm:text-[10px]">GRID SAVINGS</div><div className="mt-1 text-base font-black text-amber-500 sm:text-lg">{formatSavings(todayGridSavings)}</div><div className="text-[10px] font-bold text-slate-500">التوفير</div></div>
        </div>
      </div>

      {lastUpdated && <div className="border-t border-slate-100 px-4 py-2 text-center text-[10px] font-semibold text-slate-400">آخر قراءة: {lastUpdated}</div>}
    </section>
  );
};
