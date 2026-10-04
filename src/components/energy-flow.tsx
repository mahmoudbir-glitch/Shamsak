'use client';

import React, { useId, useState } from 'react';
import { BatteryCharging } from 'lucide-react';
import { GridTowerIcon, HouseIcon, InverterIcon, SolarPanelIcon } from '@/components/node-icons';
import { InfoTip } from '@/components/info-tip';
import { acAmpHours, acAmps, batteryText, homeText, solarText } from '@/lib/energy';
import { AmpPill } from '@/components/amp-pill';

interface EnergyFlowProps {
  solarKw: number;
  homeKw: number;
  gridKw: number;
  batteryKw: number;
  batteryPercentage: number;
  gridConnected?: boolean;
  gridVoltage?: number;
  inverterMode?: string;
  todayProductionKWh?: number;
  todayHomeUsageKWh?: number;
  todayGridSavings?: number;
  savingsCurrency?: string;
  isLive?: boolean;
  batteryAmps?: number | null;
}

const FLOW_THRESHOLD = 0.05;

export const EnergyFlow: React.FC<EnergyFlowProps> = ({
  solarKw,
  homeKw,
  gridKw,
  batteryKw,
  batteryPercentage,
  gridConnected = true,
  gridVoltage,
  inverterMode,
  todayProductionKWh,
  todayHomeUsageKWh,
  todayGridSavings,
  savingsCurrency = '$',
  isLive = false,
  batteryAmps = null,
}) => {
  const [activeNode, setActiveNode] = useState<
    'solar' | 'battery' | 'home' | 'grid' | 'inverter' | null
  >(null);

  const flowId = useId().replace(/:/g, '');
  const arrowId = `${flowId}-arrow-flow`;
  const glowId = `${flowId}-energy-glow`;

  const solarGlowStrength = Math.min(0.42, 0.12 + Math.abs(solarKw) * 0.035);
  const homeGlowStrength = Math.min(0.38, 0.10 + Math.abs(homeKw) * 0.03);
  const batteryGlowStrength = Math.min(0.40, 0.10 + Math.abs(batteryKw) * 0.035);
  const gridGlowStrength = Math.min(0.36, 0.10 + Math.abs(gridKw) * 0.03);

  const solarPulseDuration = Math.max(
    0.8,
    2.2 - Math.min(Math.abs(solarKw), 8) * 0.16
  );

  const homePulseDuration = Math.max(
    0.85,
    2.1 - Math.min(Math.abs(homeKw), 8) * 0.14
  );

  const batteryPulseDuration = Math.max(
    0.8,
    2.2 - Math.min(Math.abs(batteryKw), 8) * 0.16
  );

  const gridPulseDuration = Math.max(
    0.85,
    2.2 - Math.min(Math.abs(gridKw), 8) * 0.15
  );

  const measuredPowers = [solarKw, homeKw, gridKw, batteryKw];

  const hasNonZeroLiveReading =
    measuredPowers.every(Number.isFinite) &&
    measuredPowers.some((value) => Math.abs(value) > FLOW_THRESHOLD);

  const liveFlowActive = isLive && hasNonZeroLiveReading;

  const solarToneClass = solarText(solarKw);
  const homeToneClass = homeText(homeKw);
  const batteryToneClass = batteryText(batteryPercentage);

  const solarActive = liveFlowActive && solarKw > FLOW_THRESHOLD;
  const homeActive = liveFlowActive && homeKw > FLOW_THRESHOLD;

  const batteryCharging =
    liveFlowActive && batteryKw > FLOW_THRESHOLD;

  const batteryDischarging =
    liveFlowActive && batteryKw < -FLOW_THRESHOLD;

  const gridImporting =
    liveFlowActive &&
    gridConnected &&
    gridKw > FLOW_THRESHOLD;

  const gridExporting =
    liveFlowActive &&
    gridConnected &&
    gridKw < -FLOW_THRESHOLD;

  const inverterOffGrid =
    /off.?grid|battery/i.test(inverterMode ?? '') &&
    !gridImporting &&
    !gridExporting;

  const formatKw = (value: number) => (
    <bdi dir="ltr">
      {Math.abs(value).toFixed(2)} kW
    </bdi>
  );

  const formatKwh = (value?: number) =>
    value === undefined ? (
      '—'
    ) : (
      <bdi dir="ltr">
        {value.toFixed(1)} kWh
      </bdi>
    );

  const formatSavings = (value?: number) =>
    value === undefined
      ? '—'
      : savingsCurrency + value.toFixed(2);

  /*
   * الشبكة:
   * نحسب التيار من قدرة الشبكة والجهد المقاس من الإنفرتر.
   * إذا لم يتوفر جهد الشبكة نستخدم 230V كقيمة احتياطية.
   *
   * مهم:
   * القيمة تظهر طالما أن البيانات Live،
   * حتى لو كانت الشبكة حالياً غير مستخدمة.
   */
  const gridAmps = isLive
    ? gridVoltage &&
      Number.isFinite(gridVoltage) &&
      gridVoltage > 0
      ? Math.abs(gridKw * 1000) / gridVoltage
      : acAmps(gridKw * 1000)
    : null;

  const operatingMode = !isLive
    ? {
        label: 'بانتظار البيانات الحية',
        className:
          'border-slate-200 bg-slate-50 text-slate-600',
      }
    : gridImporting &&
      !solarActive &&
      batteryDischarging
    ? {
        label: 'البطارية أولًا',
        className:
          'border-violet-200 bg-violet-50 text-violet-700',
      }
    : gridImporting
    ? {
        label: 'الشبكة تغطي الحمل',
        className:
          'border-sky-200 bg-sky-50 text-sky-700',
      }
    : solarActive && gridExporting
    ? {
        label: 'الشمس أولًا • تصدير الفائض',
        className:
          'border-amber-200 bg-amber-50 text-amber-700',
      }
    : solarActive
    ? {
        label: 'الشمس أولًا',
        className:
          'border-emerald-200 bg-emerald-50 text-emerald-700',
      }
    : batteryDischarging
    ? {
        label: 'البطارية تغطي الحمل',
        className:
          'border-violet-200 bg-violet-50 text-violet-700',
      }
    : {
        label: 'الوضع الحالي غير محدد',
        className:
          'border-slate-200 bg-slate-50 text-slate-600',
      };

  type Spoke = {
    key: string;
    path: string;
    color: string;
    active: boolean;
    towardHub: boolean;
    kw: number;
  };

  const reverse = (d: string) => {
    const n = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);

    return `M ${n[6]} ${
