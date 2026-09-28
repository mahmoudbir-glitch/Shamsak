'use client';

import React, { useId, useState } from 'react';
import { BatteryCharging, Home, RadioTower, Sun, Zap } from 'lucide-react';
import { InfoTip } from '@/components/info-tip';
import { batteryTone, loadTone, solarTone, semanticIcon, semanticText } from '@/lib/energy';

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
  const [activeNode, setActiveNode] = useState<'solar' | 'battery' | 'home' | 'grid' | null>(null);
  const flowId = useId().replace(/:/g, '');
  const solarHomeId = `${flowId}-solar-home`;
  const homeBatteryId = `${flowId}-home-battery`;
  const batteryGridId = `${flowId}-battery-grid`;
  const gridSolarId = `${flowId}-grid-solar`;
  const arrowId = `${flowId}-arrow-flow`;
  const ringId = `${flowId}-energy-ring`;
  const glowId = `${flowId}-energy-glow`;
  const solarGlowStrength = Math.min(0.42, 0.12 + Math.abs(solarKw) * 0.035);
  const homeGlowStrength = Math.min(0.38, 0.10 + Math.abs(homeKw) * 0.03);
  const batteryGlowStrength = Math.min(0.40, 0.10 + Math.abs(batteryKw) * 0.035);
  const gridGlowStrength = Math.min(0.36, 0.10 + Math.abs(gridKw) * 0.03);
  const solarPulseDuration = Math.max(0.8, 2.2 - Math.min(Math.abs(solarKw), 8) * 0.16);
  const homePulseDuration = Math.max(0.85, 2.1 - Math.min(Math.abs(homeKw), 8) * 0.14);
  const batteryPulseDuration = Math.max(0.8, 2.2 - Math.min(Math.abs(batteryKw), 8) * 0.16);
  const gridPulseDuration = Math.max(0.85, 2.2 - Math.min(Math.abs(gridKw), 8) * 0.15);

  const measuredPowers = [solarKw, homeKw, gridKw, batteryKw];
  const hasNonZeroLiveReading = measuredPowers.every(Number.isFinite) && measuredPowers.some((value) => Math.abs(value) > FLOW_THRESHOLD);
  const liveFlowActive = isLive && hasNonZeroLiveReading;
  const solarToneClass = semanticText[solarTone(solarKw)];
  const homeToneClass = semanticText[loadTone(homeKw)];
  const batteryToneClass = semanticText[batteryTone(batteryPercentage)];

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
    <section className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.09)]" aria-label="مخطط تدفق الطاقة">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.06),transparent_32%),radial-gradient(circle_at_15%_50%,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_85%_50%,rgba(59,130,246,0.08),transparent_28%)]" />

      <div className="relative px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            تدفق الطاقة الآن
          </span>
          <span className={liveFlowActive ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700" : isLive ? "rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700" : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700"}>
            {liveFlowActive ? "● مباشر" : isLive ? "● متصل بلا قراءة" : "غير متصل"}
          </span>
        </div>
      </div>

      <div className="relative mx-auto mt-1 aspect-square w-full max-w-lg p-2 sm:p-4">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 400" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <filter id={glowId}><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" markerUnits="strokeWidth" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>

          <circle cx="200" cy="200" r="150" stroke={`url(#${ringId})`} strokeWidth="1.5" opacity="0.14" strokeDasharray="4 9" />
          <path d={solarHomePath} pathLength="100" stroke={solarToHome ? "#10B981" : "#CBD5E1"} strokeWidth="4" strokeLinecap="round" opacity={solarToHome ? 0.95 : 0.16} markerEnd={solarToHome ? `url(#${arrowId})` : undefined}
            id={solarHomeId} className={solarToHome ? activeFlowClass : dashedFlowClass} />
          <path d={homeBatteryPath} pathLength="100" stroke={batteryDischarging ? "#10B981" : homeToBattery ? "#D97706" : "#CBD5E1"} strokeWidth="4" strokeLinecap="round" opacity={batteryDischarging || homeToBattery ? 0.95 : 0.16} markerEnd={batteryDischarging || homeToBattery ? `url(#${arrowId})` : undefined}
            id={homeBatteryId} className={batteryDischarging || homeToBattery ? activeFlowClass : dashedFlowClass} />
          <path d={batteryGridPath} pathLength="100" stroke={batteryToGrid ? "#8B5CF6" : gridToBattery ? "#D97706" : "#CBD5E1"} strokeWidth="4" strokeLinecap="round" opacity={batteryToGrid || gridToBattery ? 0.95 : 0.16} markerEnd={batteryToGrid || gridToBattery ? `url(#${arrowId})` : undefined}
            id={batteryGridId} className={batteryToGrid || gridToBattery ? activeFlowClass : dashedFlowClass} />
          <path d={gridSolarPath} pathLength="100" stroke={solarToGrid ? "#10B981" : gridToSolar ? "#D97706" : "#CBD5E1"} strokeWidth="4" strokeLinecap="round" opacity={solarToGrid || gridToSolar ? 0.95 : 0.16} markerEnd={solarToGrid || gridToSolar ? `url(#${arrowId})` : undefined}
            id={gridSolarId} className={solarToGrid || gridToSolar ? activeFlowClass : dashedFlowClass} />

          {solarToHome && (
            <circle r="4" fill="#10B981" filter={`url(#${glowId})`}>
              <animateMotion dur="1.7s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#${solarHomeId}`} />
              </animateMotion>
            </circle>
          )}
          {(batteryDischarging || homeToBattery) && (
            <circle r="4" fill={batteryDischarging ? "#10B981" : "#D97706"} filter={`url(#${glowId})`}>
              <animateMotion dur="1.9s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#${homeBatteryId}`} />
              </animateMotion>
            </circle>
          )}
          {(batteryToGrid || gridToBattery) && (
            <circle r="4" fill={batteryToGrid ? "#8B5CF6" : "#D97706"} filter={`url(#${glowId})`}>
              <animateMotion dur="2s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#${batteryGridId}`} />
              </animateMotion>
            </circle>
          )}
          {(solarToGrid || gridToSolar) && (
            <circle r="4" fill={solarToGrid ? "#10B981" : "#D97706"} filter={`url(#${glowId})`}>
              <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#${gridSolarId}`} />
              </animateMotion>
            </circle>
          )}

          <circle cx="200" cy="200" r="38" fill="white" stroke="#FDE68A" strokeWidth="1.5" opacity="0.95" />
          <circle cx="200" cy="200" r="30" fill="#FFFBEB" stroke="#D97706" strokeWidth="1.5" filter={`url(#${glowId})`} />
          <circle cx="200" cy="200" r="22" fill="white" />
        </svg>

        <button type="button" onClick={() => setActiveNode("solar")} aria-label="عرض تفاصيل الطاقة الشمسية" className="absolute left-1/2 top-[6%] z-10 w-[32%] min-w-[100px] -translate-x-1/2 text-center transition-transform active:scale-95">
          <div
            className="relative mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100"
            style={solarActive ? { boxShadow: `0 10px 28px rgba(245,158,11,${solarGlowStrength}), 0 0 ${Math.round(18 + Math.abs(solarKw) * 3)}px rgba(245,158,11,${solarGlowStrength * 0.55})`, animation: `energy-node-pulse ${solarPulseDuration}s ease-in-out infinite` } : undefined}
          >
            <span className={solarActive ? "absolute inset-1 rounded-[1rem] border border-amber-300/50 animate-pulse" : "hidden"} />
            <Sun className="h-9 w-9 text-amber-500" strokeWidth={2.2} />
          </div>
          <div className="mt-1.5 text-xs font-black text-slate-700">الطاقة الشمسية</div>
          <div className={"text-base font-black " + solarToneClass}>{formatKw(solarKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">{solarActive ? "إنتاج الآن" : "لا يوجد توليد"}</div>
        </button>

        <button type="button" onClick={() => setActiveNode("grid")} aria-label="عرض تفاصيل الشبكة" className="absolute left-[1%] top-1/2 z-10 w-[29%] min-w-[94px] -translate-y-1/2 text-center transition-transform active:scale-95">
          <div
            className={gridConnected ? "mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50" : "mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-slate-100"}
            style={gridConnected && (gridImporting || gridExporting) ? { boxShadow: `0 10px 24px rgba(139,92,246,${gridGlowStrength}), 0 0 ${Math.round(16 + Math.abs(gridKw) * 2.5)}px rgba(139,92,246,${gridGlowStrength * 0.5})`, animation: `energy-node-pulse ${gridPulseDuration}s ease-in-out infinite` } : undefined}
          >
            <RadioTower className={gridConnected ? "h-8 w-8 text-violet-500" : "h-8 w-8 text-slate-400"} strokeWidth={2.1} />
          </div>
          <div className="mt-1.5 text-xs font-black text-slate-700">الشبكة</div>
          <div className={gridConnected ? "text-sm font-black text-violet-600" : "text-sm font-black text-slate-500"}>{gridConnected ? "متصلة" : "مقطوعة"}</div>
          <div className="text-[10px] font-bold text-slate-500">{liveFlowActive && gridConnected ? (gridExporting ? "تصدير الفائض" : gridImporting ? "سحب الطاقة" : "متوازنة") : "لا يوجد تدفق"}</div>
        </button>

        <button type="button" onClick={() => setActiveNode("home")} aria-label="عرض تفاصيل المنزل" className="absolute right-[1%] top-1/2 z-10 w-[29%] min-w-[94px] -translate-y-1/2 text-center transition-transform active:scale-95">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-100"
            style={homeActive ? { boxShadow: `0 10px 24px rgba(14,165,233,${homeGlowStrength}), 0 0 ${Math.round(16 + Math.abs(homeKw) * 2.5)}px rgba(14,165,233,${homeGlowStrength * 0.5})`, animation: `energy-node-pulse ${homePulseDuration}s ease-in-out infinite` } : undefined}
          >
            <Home className="h-8 w-8 text-sky-500" strokeWidth={2.1} />
          </div>
          <div className="mt-1.5 text-xs font-black text-slate-700">المنزل</div>
          <div className={"text-sm font-black " + homeToneClass}>{formatKw(homeKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">{homeActive ? "استهلاك الآن" : "لا توجد قراءة"}</div>
        </button>

        <button type="button" onClick={() => setActiveNode("battery")} aria-label="عرض تفاصيل البطارية" className="absolute bottom-[6%] left-1/2 z-10 w-[34%] min-w-[110px] -translate-x-1/2 text-center transition-transform active:scale-95">
          <div
            className="relative mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.35rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-100"
            style={batteryCharging || batteryDischarging ? { boxShadow: `0 10px 28px rgba(16,185,129,${batteryGlowStrength}), 0 0 ${Math.round(18 + Math.abs(batteryKw) * 3)}px rgba(16,185,129,${batteryGlowStrength * 0.55})`, animation: `energy-node-pulse ${batteryPulseDuration}s ease-in-out infinite` } : undefined}
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-emerald-400 bg-white/80">
              <BatteryCharging className="absolute h-5 w-5 -translate-y-3 text-emerald-500" strokeWidth={2.3} />
              <span className={"mt-2 text-sm font-black " + batteryToneClass}>{batteryPercentage.toFixed(0)}%</span>
            </div>
          </div>
          <div className="mt-1.5 text-xs font-black text-slate-700">البطارية</div>
          <div className={"text-sm font-black " + batteryToneClass}>{formatKw(batteryKw)}</div>
          <div className="text-[10px] font-bold text-slate-500">{batteryCharging ? "تشحن الآن" : batteryDischarging ? "تفرغ الآن" : "ثابتة"}</div>
        </button>

        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-white shadow-[0_8px_28px_rgba(245,158,11,0.22)]">
            <span className="absolute inset-1 rounded-full border border-amber-300/40" />
            <Zap className="h-6 w-6 text-amber-500" fill="currentColor" strokeWidth={1.8} />
          </div>
        </div>
      </div>

<style jsx>{`
  @keyframes energy-node-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.055); }
  }
`}</style>

      <div className="relative mt-2 px-4 sm:px-6">
        {activeNode ? (
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur" role="status">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-900">
                {activeNode === "solar" && "تفاصيل الطاقة الشمسية"}
                {activeNode === "battery" && "تفاصيل البطارية"}
                {activeNode === "home" && "تفاصيل المنزل"}
                {activeNode === "grid" && "تفاصيل الشبكة"}
              </div>
              <button type="button" onClick={() => setActiveNode(null)} className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100">إغلاق</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {activeNode === "solar" && (
                <>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">الإنتاج الآن</div><div className={"mt-1 font-black " + solarToneClass}>{formatKw(solarKw)}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">الحالة</div><div className="mt-1 font-black text-slate-800">{solarActive ? "يولّد طاقة" : "لا يوجد توليد مؤكد"}</div></div>
                </>
              )}
              {activeNode === "battery" && (
                <>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">حالة الشحن</div><div className={"mt-1 font-black " + batteryToneClass}>{batteryPercentage.toFixed(0)}%</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">القدرة</div><div className="mt-1 font-black text-slate-800">{formatKw(batteryKw)}</div></div>
                </>
              )}
              {activeNode === "home" && (
                <>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">الاستهلاك الآن</div><div className={"mt-1 font-black " + homeToneClass}>{formatKw(homeKw)}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">الحمل</div><div className="mt-1 font-black text-slate-800">{homeActive ? "نشط" : "لا توجد قراءة حية مؤكدة"}</div></div>
                </>
              )}
              {activeNode === "grid" && (
                <>
                  <div className="rounded-xl bg-sky-50 p-3"><div className="font-bold text-slate-500">الحالة</div><div className="mt-1 font-black text-sky-700">{gridConnected ? "متصلة" : "مقطوعة"}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="font-bold text-slate-500">التدفق</div><div className="mt-1 font-black text-slate-800">{gridExporting ? "تصدير" : gridImporting ? "سحب" : "متوازن / لا يوجد تدفق"}</div></div>
                </>
              )}
            </div>
            <p className="mt-3 text-[11px] font-semibold text-slate-500">اضغط على أي عقدة أخرى لعرض تفاصيلها. الأرقام هنا مأخوذة من بيانات الإنفرتر الحالية ولا يتم توليد أرقام DEMO.</p>
          </div>
        ) : null}
      </div>

      {!liveFlowActive && <div className="relative mx-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs font-bold text-amber-800 sm:mx-6">⚠️ لا توجد قراءة حية متاحة حاليًا. تحقّق من اتصال الإنفرتر وإرسال بيانات القياس.</div>}

      <div className="relative border-t border-slate-100 bg-slate-50/70 px-3 py-4 sm:px-5">
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200 text-center">
          <div className="px-2"><div className="text-[9px] font-black tracking-wide text-slate-400 sm:text-[10px]">TODAY'S PRODUCTION</div><div className={"mt-1 text-base font-black " + semanticText[solarTone(todayProductionKWh ?? 0)] + " sm:text-lg"}>{formatKwh(todayProductionKWh)}</div><div className="text-[10px] font-bold text-slate-500">إنتاج اليوم</div></div>
          <div className="px-2"><div className="text-[9px] font-black tracking-wide text-slate-400 sm:text-[10px]">HOME USAGE</div><div className={"mt-1 text-base font-black " + semanticText[loadTone(todayHomeUsageKWh ?? 0)] + " sm:text-lg"}>{formatKwh(todayHomeUsageKWh)}</div><div className="text-[10px] font-bold text-slate-500">استهلاك المنزل</div></div>
          <div className="px-2"><div className="text-[9px] font-black tracking-wide text-slate-400 sm:text-[10px]">GRID SAVINGS</div><div className="mt-1 text-base font-black text-amber-500 sm:text-lg">{formatSavings(todayGridSavings)}</div><div className="text-[10px] font-bold text-slate-500">التوفير</div></div>
        </div>
      </div>

      {lastUpdated && <div className="relative border-t border-slate-100 px-4 py-2 text-center text-[10px] font-semibold text-slate-400">آخر قراءة: {lastUpdated}</div>}
    </section>
  );
};
