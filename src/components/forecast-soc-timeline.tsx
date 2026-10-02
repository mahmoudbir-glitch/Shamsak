"use client";

import React from "react";
import type { DayForecast } from "@/lib/smart-forecast";
import { AmpPill } from "@/components/amp-pill";
import { batteryAmpHours } from "@/lib/energy";

const OK = "#10b981";
const LOW = "#f59e0b";
const CRITICAL = "#f43f5e";

/** A small horizontal battery drawn to a level, the same shape on every day card. */
function BatteryGauge({ pct, color }: { pct: number; color: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 64 26" className="h-6 w-16" aria-hidden="true">
      <rect x="1" y="1" width="56" height="24" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="58.5" y="8" width="4" height="10" rx="2" fill="#cbd5e1" />
      <rect x="4" y="4" width={Math.max(0, (50 * p) / 100)} height="18" rx="4" fill={color} />
    </svg>
  );
}

/**
 * Battery forecast for the next days: a card per day with the level at
 * sunrise and sunset (in % and amp-hours) and when the battery fills.
 */
export function ForecastSocTimeline({ forecasts, reservePct, capacityWh, days = 4 }: { forecasts: DayForecast[]; reservePct: number; capacityWh: number; days?: number }) {
  const shown = forecasts.slice(0, days);
  if (!shown.length) return null;
  const colorFor = (soc: number) => (soc < reservePct ? CRITICAL : soc < reservePct + 10 ? LOW : OK);
  const ah = (pct: number) => batteryAmpHours((capacityWh * pct) / 100 / 1000);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" dir="rtl">
      {shown.map((day, index) => {
        // Today after sunrise the "morning" value is simply the level now.
        const startLabel = index === 0 && day.sunrise && Date.now() > new Date(day.sunrise).getTime() ? "الآن" : "الشروق";
        const sunset = day.chargeAtSunsetPct;
        const sunrise = day.chargeAtSunrisePct;
        return (
          <div key={day.date} className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-black text-slate-900">{day.label}</span>
              <BatteryGauge pct={sunset} color={colorFor(sunset)} />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <span className={"h-2 w-2 rounded-full " + (day.fullChargeTime ? "bg-emerald-600" : "bg-slate-300")} />
              {day.fullChargeTime ? <>تمتلئ نحو <bdi dir="ltr" className="font-black text-emerald-700">{day.fullChargeTime.slice(11, 16)}</bdi></> : "لا تمتلئ"}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-center">
              <div className="rounded-xl bg-indigo-50/70 px-1 py-1.5">
                <div className="text-[10px] font-bold text-slate-500">{startLabel}</div>
                <div className="text-sm font-black" style={{ color: colorFor(sunrise) }}><bdi dir="ltr">{sunrise}%</bdi></div>
                <AmpPill tone="emerald" unit="Ah" amps={ah(sunrise)} className="mt-1 !min-w-0 !px-1.5" />
              </div>
              <div className="rounded-xl bg-amber-50/70 px-1 py-1.5">
                <div className="text-[10px] font-bold text-slate-500">الغروب</div>
                <div className="text-sm font-black" style={{ color: colorFor(sunset) }}><bdi dir="ltr">{sunset}%</bdi></div>
                <AmpPill tone="emerald" unit="Ah" amps={ah(sunset)} className="mt-1 !min-w-0 !px-1.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
