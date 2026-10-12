"use client";

import { BatteryFlowSplit } from "@/components/energy-split";
import React, { useCallback, useEffect, useState } from "react";
import { BatteryCharging, Loader2, Zap } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { arabicDuration, batteryAmpHours, batteryAmps, batteryState, batteryStateLabel, batteryText } from "@/lib/energy";
import { AmpPill } from "@/components/amp-pill";
import { PageHeader } from "@/components/page-header";
import { SocChart } from "@/components/soc-chart";
import type { LoadPoint } from "@/components/load-chart";
import { startVisiblePolling } from "@/lib/visible-polling";

const REFRESH_MS = 15_000;
type BatterySettings = { batteryCapacityWh: number; batteryMinReservePct: number; batteryChemistry?: string | null; batteryNominalVoltage?: number };
type History = { points: LoadPoint[]; timezone: string; batteryToday: { chargeKWh: number; dischargeKWh: number } | null; socToday: { min: number; max: number } | null };

/** تقدير الوقت المتبقي حتى الاكتمال أو حتى حدّ الاحتياطي، من السعة والقدرة الحالية. */
function estimate(soc: number, powerW: number, settings: BatterySettings | null) {
  if (!settings || Math.abs(powerW) < 50) return null;
  const capacity = settings.batteryCapacityWh;
  const charging = powerW > 0;
  const energyWh = charging ? ((100 - soc) / 100) * capacity : (Math.max(0, soc - settings.batteryMinReservePct) / 100) * capacity;
  if (!charging && energyWh <= 0) return { charging, label: "عند حد الاحتياطي" };
  const hours = energyWh / Math.abs(powerW);
  if (!Number.isFinite(hours)) return null;
  const minutes = Math.round(hours * 60);
  const label = hours > 48 ? "أكثر من 48 ساعة" : minutes < 1 ? "أقل من دقيقة" : arabicDuration(minutes);
  return { charging, label };
}

/** Ten cells, filled from the right (RTL) up to the charge; the reserve is a dashed line. */
const CELLS = 10;
const BODY = { x: 30, width: 250, gap: 4 } as const;

function BatteryGauge({ soc, reservePct, tone, charging }: { soc: number; reservePct: number; tone: string; charging: boolean }) {
  const cell = (BODY.width - BODY.gap * (CELLS - 1)) / CELLS;
  const right = BODY.x + BODY.width;
  const reserveX = right - (reservePct / 100) * BODY.width;
  const flowTone = charging ? "text-emerald-500" : soc <= reservePct ? "text-rose-500" : "text-amber-500";
  return (
    <svg viewBox="0 0 300 120" className="h-auto w-full" role="img" aria-label={`البطارية مشحونة ${Math.round(soc)}٪، والاحتياطي ${reservePct}٪`}>
      {/* خط ديناميكي خارجي فقط: يتبع محيط البطارية من الخارج ولا يدخل بين الخانات. */}
      <path
        d="M20 6 H290 A6 6 0 0 1 296 12 V108 A6 6 0 0 1 290 114 H20 A6 6 0 0 1 14 108 V84 H8 A6 6 0 0 1 2 78 V42 A6 6 0 0 1 8 36 H14 V12 A6 6 0 0 1 20 6 Z"
        fill="none"
        className={"stroke-current " + flowTone}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="8 7"
        opacity={charging ? 0.95 : 0.3}
      >
        {charging && <animate attributeName="stroke-dashoffset" from="0" to="-60" dur="1.8s" repeatCount="indefinite" />}
      </path>

      {/* جسم البطارية ورأسها — بدون أي خط زخرفي داخل الخانات. */}
      <rect x="4" y="42" width="14" height="36" rx="4" className="fill-slate-300" />
      <rect x="20" y="10" width="270" height="100" rx="16" className="fill-white stroke-slate-300" strokeWidth="3" />
      {Array.from({ length: CELLS }, (_, i) => {
        const x = right - (i + 1) * cell - i * BODY.gap;
        const fill = Math.min(1, Math.max(0, soc / 10 - i));
        const width = cell * fill;
        return (
          <g key={i}>
            <rect x={x} y="20" width={cell} height="80" rx="5" className="fill-slate-100" />
            {width > 0 && <rect x={x + cell - width} y="20" width={width} height="80" rx="5" className={"fill-current motion-safe:transition-all motion-safe:duration-700 " + tone} />}
          </g>
        );
      })}
      {/* Reserve limit */}
      <line x1={reserveX} x2={reserveX} y1="14" y2="106" className="stroke-rose-400" strokeWidth="2" strokeDasharray="5 4" />
      {charging && <path d="M159 30 L141 64 H154 L148 92 L169 54 H156 Z" className="fill-amber-400 stroke-white" strokeWidth="3" strokeLinejoin="round" />}
    </svg>
  );
}

/** One instrument reading: label on top, value, then a small note. */
function Reading({ label, value, unit, note, muted = false }: { label: string; value: string; unit?: string; note?: React.ReactNode; muted?: boolean }) {
  return (
    <div className="min-w-0 px-3 first:pr-0 last:pl-0">
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className={"mt-1 whitespace-nowrap text-xl font-black leading-7 " + (muted ? "text-slate-300" : "text-slate-900")}>
        {unit ? <bdi dir="ltr">{value}<small className="text-xs font-bold text-slate-500"> {unit}</small></bdi> : <bdi>{value}</bdi>}
      </div>
      <div className="mt-1 min-h-[20px] text-[11px] font-semibold leading-4 text-slate-400">{note}</div>
    </div>
  );
}

export default function BatteryPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [settings, setSettings] = useState<BatterySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<History | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/telemetry", { cache: "no-store" });
      if (!response.ok) throw new Error("telemetry_unavailable");
      const data = (await response.json()) as EnergySnapshot;
      if (data.source !== "live") throw new Error("not_live");
      setSnapshot(data);
    } catch {
      // نُبقي آخر قراءة صحيحة ظاهرة بدل استبدالها بأرقام تجريبية.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/settings", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.batteryCapacityWh) setSettings({ batteryCapacityWh: d.batteryCapacityWh, batteryMinReservePct: d.batteryMinReservePct ?? 20, batteryChemistry: d.batteryChemistry, batteryNominalVoltage: d.batteryNominalVoltage }); }).catch(() => {});
    const loadHistory = () => void fetch("/api/telemetry/history", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setHistory(d as History); }).catch(() => {});
    loadHistory();