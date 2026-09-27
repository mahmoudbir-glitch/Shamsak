'use client';

import React, { useState } from 'react';
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
  const [activeNode, setActiveNode] = useState<'solar' | 'battery' | 'home' | 'grid' | null>(null);\n\n  const measuredPowers = [solarKw, homeKw, gridKw, batteryKw];
  const hasNonZeroLiveReading = measuredPowers.every(Number.isFinite) && measuredPowers.some((value) => Math.abs(value) > FLOW_THRESHOLD);
  const liveFlowActive = isLive && hasNonZeroLiveReading;

  const solarActive = liveFlowActive && solarKw > FLOW_THRESHOLD;
  const homeActive = liveFlowActive && homeKw > FLOW_THRESHOLD;
  const batteryCharging = liveFlowActive && batteryKw > FLOW_THRESHOLD;
  const batteryDischarging = liveFlowActive && batteryKw < -FLOW_THRESHOLD;
  const gridImporting = liveFlowActive && gridConnected && gridKw > FLOW_THRESHOLD;
  const gridExporting = liveFlowActive && gridConnected && gridKw < -FLOW_THRESHOLD;

  const activeFlowClass = 'energy-flow-path energy-flow-active';
  const dashedFlowClass = 'energy-flow-path';

  // Four independent circular-arc channels. Direction is derived only from
  // live telemetry; inactive channels remain faint dashed guides.
  const solarToHome = solarActive && homeActive;
  const batteryToHome = batteryDischarging && homeActive;
  const homeToBattery = batteryCharging && solarActive;
  const batteryToGrid = batteryDischarging && gridConnected && gridExporting;
  const gridToBattery = batteryCharging && gridConnected && gridImporting;
  const solarToGrid = solarActive && gridConnected && gridExporting;
  const gridToSolar = gridConnected && gridImporting && !solarActive;

  const formatKw = (value: number) => Math.abs(value).toFixed(2) + ' kW';
  const formatKwh = (value?: number) => value === undefined ? '—' : value.toFixed(1) + ' kWh';
  const formatSavings = (value?: number) => value === undefined ? '—' : savingsCurrency + value.toFixed(2);

  const operatingMode = !isLive
    ? { label: 'بانتظار البيانات الحية', className: 'border-slate-200 bg-slate-50 text-slate-600' }
    : gridImporting && !solarActive && batteryDischarging
      ? { label: 'البطارية أولًا', className: 'border-violet-200 bg-violet-50 text-violet-700' }
      : gridImporting
        ? { label: 'الشبكة تغطي الحمل', className: 'border-sky-200 bg-sky-50 text-sky-700' }
        : solarActive && gridExporting
          ? { label: 'الشمس أولًا • تصدير الفائض', className: 'border-amber-200 bg-amber-50 text-amber-700' }
          : solarActive
            ? { label: 'الشمس أولًا', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
            : batteryDischarging
              ? { label: 'البطارية تغطي الحمل', className: 'border-violet-200 bg-violet-50 text-violet-700' }
              : { label: 'الوضع الحالي غير محدد', className: 'border-slate-200 bg-slate-50 text-slate-600' };

  // The four icon centers sit on one imaginary circle:
  // top (200,65) -> right (335,200) -> bottom (200,335) -> left (65,200).
  // Each route is a true quarter-circle arc with the same radius (135).
  const solarHomePath = solarToHome
    ? 'M 200 65 A 135 135 0 0 1 335 200'
    : 'M 335 200 A 135 135 0 0 0 200 65';
  const homeBatteryPath = homeToBattery
    ? 'M 335 200 A 135 135 0 0 1 200 335'
    : 'M 200 335 A 135 135 0 0 0 335 200';
  const batteryGridPath = batteryToGrid
    ? 'M 200 335 A 135 135 0 0 1 65 200'
    : 'M 65 200 A 135 135 0 0 0 200 335';
  const gridSolarPath = solarToGrid
    ? 'M 200 65 A 135 135 0 0 0 65 200'
    : 'M 65 200 A 135 135 0 0 1 200 65';

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
            <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${operatingMode.className}`}>
              وضع التشغيل: {operatingMode.label}
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
            <marker id="arrow-flow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" markerUnits="strokeWidth" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker>
          </defs>
          <path
            d={solarHomePath}
            pathLength="100"
            stroke={solarToHome ? '#10B981' : '#CBD5E1'}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={solarToHome ? 1 : 0.18}
            markerEnd={solarToHome ? 'url(#arrow-flow)' : undefined}
            className={solarToHome ? activeFlowClass : dashedFlowClass}
          />
          <path
            d={homeBatteryPath}
            pathLength="100"
            stroke={batteryDischarging ? '#10B981' : homeToBattery ? '#F59E0B' : '#CBD5E1'}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={batteryDischarging || homeToBattery ? 1 : 0.18}
            markerEnd={batteryDischarging || homeToBattery ? 'url(#arrow-flow)' : undefined}
            className={batteryDischarging || homeToBattery ? activeFlowClass : dashedFlowClass}
          />
          <path
            d={batteryGridPath}
            pathLength="100"
            stroke={batteryToGrid ? '#8B5CF6' : gridToBattery ? '#F59E0B' : '#CBD5E1'}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={batteryToGrid || gridToBattery ? 1 : 0.18}
            markerEnd={batteryToGrid || gridToBattery ? 'url(#arrow-flow)' : undefined}
            className={batteryToGrid || gridToBattery ? activeFlowClass : dashedFlowClass}
          />
          <path
            d={gridSolarPath}
            pathLength="100"
            stroke={solarToGrid ? '#10B981' : gridToSolar ? '#F59E0B' : '#CBD5E1'}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity={solarToGrid || gridToSolar ? 1 : 0.18}
            markerEnd={solarToGrid || gridToSolar ? 'url(#arrow-flow)' : undefined}
            className={solarToGrid || gridToSolar ? activeFlowClass : dashedFlowClass}
          />
          <circle cx="200" cy="200" r="28" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="20" fill="#FFFBEB" />
        </svg>

        <button type="button" onClick={() => setActiveNode('solar')} aria-label="عرض تفاصيل الطاقة الشمسية" className="absolute left-1/2 top-[8%] z-10 w-[30%] min-w-[96px] -translate-x-1/2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-[0_8px_22px_rgba(245,158,11,0.16)] sm:h-[4.5rem] sm:w-[4.5rem]">
            <Sun className="h-9 w-9 text-amber-500" strokeWidth={2.2} />
          </div>
          <div className="mt-1.5 text-[11px] font-black tracking-widest text-slate-400">SOLAR</div>
          <div className="text-sm font-black text-emerald-600 sm:text-base">{formatKw(solarKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">إنتاج حالي</div>
        </button>

        <button type="button" onClick={() => setActiveNode('grid')} aria-label="عرض تفاصيل الشبكة" className="absolute left-[2.5%] top-1/2 z-10 w-[27%] min-w-[88px] -translate-y-1/2 text-center">
          <div className={gridConnected ? "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm sm:h-16 sm:w-16" : "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 shadow-sm sm:h-16 sm:w-16"}>
            <RadioTower className={gridConnected ? "h-8 w-8 text-emerald-500" : "h-8 w-8 text-slate-400"} strokeWidth={2.1} />
          </div>
          <div className="mt-1.5 text-[10px] font-black tracking-wide text-slate-400">GRID</div>
          <div className={gridConnected ? "text-sm font-black text-emerald-600 sm:text-base" : "text-sm font-black text-slate-500 sm:text-base"}>
            {gridConnected ? "متصلة" : "مقطوعة"}
          </div>
          <div className="text-[10px] font-bold text-slate-500">{liveFlowActive && gridConnected ? (gridExporting ? "تصدير" : gridImporting ? "سحب" : "متوازنة") : "لا يوجد تدفق"}</div>
        </button>

        <button type="button" onClick={() => setActiveNode('home')} aria-label="عرض تفاصيل المنزل" className="absolute right-[2.5%] top-1/2 z-10 w-[27%] min-w-[88px] -translate-y-1/2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 shadow-sm sm:h-16 sm:w-16">
            <Home className="h-8 w-8 text-blue-500" strokeWidth={2.1} />
          </div>
          <div className="mt-1.5 text-[10px] font-black tracking-wide text-slate-400">HOME</div>
          <div className="text-sm font-black text-blue-600 sm:text-base">{formatKw(homeKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">استهلاك حالي</div>
        </button>

        <button type="button" onClick={() => setActiveNode('battery')} aria-label="عرض تفاصيل البطارية" className="absolute bottom-[8%] left-1/2 z-10 w-[32%] min-w-[106px] -translate-x-1/2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300 bg-white shadow-[0_8px_22px_rgba(16,185,129,0.14)] sm:h-[4.5rem] sm:w-[4.5rem]">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-emerald-400">
              <BatteryCharging className="absolute h-5 w-5 -translate-y-3 text-emerald-500" strokeWidth={2.3} />
              <span className="mt-2 text-sm font-black text-slate-800">{batteryPercentage.toFixed(0)}%</span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] font-black tracking-wide text-slate-400">BATTERY</div>
          <div className="text-sm font-black text-emerald-600 sm:text-base">{formatKw(batteryKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">{batteryCharging ? 'تشحن' : batteryDischarging ? 'تفرغ' : 'ثابتة'}</div>
        </button>

        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-white shadow-md sm:h-12 sm:w-12">
            <Zap className="h-5 w-5 text-amber-500 sm:h-6 sm:w-6" fill="currentColor" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      <div className="mt-3 px-4 sm:px-6">
        {activeNode && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" role="status">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-900">
                {activeNode === 'solar' ? 'تفاصيل الألواح الشمسية' : activeNode === 'battery' ? 'تفاصيل البطارية' : activeNode === 'home' ? 'تفاصيل المنزل' : 'تفاصيل الشبكة'}
              </div>
              <button type="button" onClick={() => setActiveNode(null)} className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100">إغلاق</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {activeNode === 'solar' && <>
                <div className="rounded-xl bg-amber-50 p-3"><div className="font-bold text-slate-500">الإنتاج الآن</div><div className="mt-1 font-black text-amber-700">{formatKw(solarKw)}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">الحالة</div><div className="mt-1 font-black text-slate-800">{solarActive ? 'يولّد طاقة' : 'لا يوجد توليد مؤكد'}</div></div>
              </>}
              {activeNode === 'battery' && <>
                <div className="rounded-xl bg-emerald-50 p-3"><div className="font-bold text-slate-500">حالة الشحن</div><div className="mt-1 font-black text-emerald-700">{batteryPercentage.toFixed(0)}%</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">القدرة</div><div className="mt-1 font-black text-slate-800">{formatKw(batteryKw)}</div></div>
              </>}
              {activeNode === 'home' && <>
                <div className="rounded-xl bg-blue-50 p-3"><div className="font-bold text-slate-500">الاستهلاك الآن</div><div className="mt-1 font-black text-blue-700">{formatKw(homeKw)}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">الحمل</div><div className="mt-1 font-black text-slate-800">{homeActive ? 'نشط' : 'لا توجد قراءة حية مؤكدة'}</div></div>
              </>}
              {activeNode === 'grid' && <>
                <div className="rounded-xl bg-sky-50 p-3"><div className="font-bold text-slate-500">الحالة</div><div className="mt-1 font-black text-sky-700">{gridConnected ? 'متصلة' : 'مقطوعة'}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">التدفق</div><div className="mt-1 font-black text-slate-800">{gridExporting ? 'تصدير' : gridImporting ? 'سحب' : 'متوازن / لا يوجد تدفق'}</div></div>
              </>}
            </div>
            <p className="mt-3 text-[11px] font-semibold text-slate-500">اضغط على أي عقدة أخرى لعرض تفاصيلها. الأرقام هنا مأخوذة من بيانات الإنفرتر الحالية ولا يتم توليد أرقام DEMO.</p>
          </div>
        )}
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
