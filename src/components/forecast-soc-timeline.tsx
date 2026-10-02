"use client";

import React, { useMemo, useState } from "react";
import type { DayForecast } from "@/lib/smart-forecast";
import { AmpPill } from "@/components/amp-pill";
import { batteryAmpHours } from "@/lib/energy";

const W = 640;
const H = 170;
const PAD = { top: 10, right: 6, bottom: 24, left: 38 };
const STEP_H = 2; // one cell = 2 hours
const OK = "#10b981";
const LOW = "#f59e0b";
const CRITICAL = "#f43f5e";

const hourOf = (iso: string) => Number(iso.slice(11, 13)) + Number(iso.slice(14, 16) || 0) / 60;

type Cell = { h: number; soc: number | null; night: boolean; label: string };

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
 * Battery forecast for the next days, in two parts: a card per day (level at
 * sunset and sunrise, in % and amp-hours, and when it fills), then a row of
 * battery cells, one per two hours, filled to the expected level, with night
 * cells on an indigo track and the reserve as a dashed line.
 */
export function ForecastSocTimeline({ forecasts, reservePct, capacityWh, days = 4 }: { forecasts: DayForecast[]; reservePct: number; capacityWh: number; days?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const shown = forecasts.slice(0, days);
  const colorFor = (soc: number) => (soc < reservePct ? CRITICAL : soc < reservePct + 10 ? LOW : OK);
  const ah = (pct: number) => batteryAmpHours((capacityWh * pct) / 100 / 1000);

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    shown.forEach((day, i) => {
      const rise = day.sunrise ? hourOf(day.sunrise) : 6;
      const set = day.sunset ? hourOf(day.sunset) : 18;
      for (let start = 0; start < 24; start += STEP_H) {
        // level at the end of this 2-hour slot = last simulated hour inside it
        const inSlot = day.hourly.filter((p) => typeof p.socPct === "number" && hourOf(p.time) >= start && hourOf(p.time) < start + STEP_H);
        const last = inSlot[inSlot.length - 1];
        const mid = start + STEP_H / 2;
        out.push({
          h: i * 24 + start,
          soc: last ? (last.socPct as number) : null,
          night: mid < rise || mid > set,
          label: `${day.label} ${String(start + STEP_H).padStart(2, "0")}:00`,
        });
      }
    });
    return out;
  }, [shown]);

  if (!cells.some((c) => c.soc !== null)) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const base = PAD.top + plotH;
  const slot = plotW / cells.length;
  const cellW = Math.max(3, slot - 2.5);
  const r = Math.min(3, cellW / 2);
  const y = (soc: number) => PAD.top + (1 - Math.max(0, Math.min(100, soc)) / 100) * plotH;
  const shownCell = active !== null ? cells[active] : null;

  return (
    <div className="space-y-4">
      {/* one card per day */}
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

      {/* battery cells across the days */}
      <div className="relative" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-none select-none" role="img" aria-label="توقع نسبة البطارية كل ساعتين خلال الأيام القادمة" onPointerLeave={() => setActive(null)}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#eef2f6" />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#94a3b8">{v}%</text>
            </g>
          ))}
          {cells.map((c, i) => {
            const x0 = PAD.left + i * slot;
            const cx = x0 + (slot - cellW) / 2;
            return (
              <g key={i}>
                {active === i && <rect x={x0} y={PAD.top - 2} width={slot} height={plotH + 4} rx={4} fill="#f8fafc" stroke="#e2e8f0" />}
                <rect x={cx} y={PAD.top} width={cellW} height={plotH} rx={r} fill={c.night ? "#e0e7ff" : "#f1f5f9"} />
                {c.soc !== null && c.soc > 0 && (
                  <rect x={cx} y={y(c.soc)} width={cellW} height={Math.max(r * 2, base - y(c.soc))} rx={r} fill={colorFor(c.soc)} opacity={c.night ? 0.85 : 1} />
                )}
                <rect x={x0} y={PAD.top} width={slot} height={plotH + PAD.bottom} fill="transparent" onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} />
              </g>
            );
          })}
          {shown.map((day, i) => (
            <g key={day.date}>
              {i > 0 && <line x1={PAD.left + i * (plotW / shown.length)} x2={PAD.left + i * (plotW / shown.length)} y1={PAD.top - 4} y2={base + 4} stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 3" />}
              <text x={PAD.left + (i + 0.5) * (plotW / shown.length)} y={H - 6} textAnchor="middle" fontSize={12} fontWeight={800} fill="#64748b">{day.label}</text>
            </g>
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={y(reservePct)} y2={y(reservePct)} stroke={LOW} strokeDasharray="5 4" strokeWidth={1.25} pointerEvents="none" />
        </svg>

        {shownCell && active !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-md"
            style={{ left: `${Math.min(64, Math.max(2, ((PAD.left + active * slot) / W) * 100 - 14))}%` }}
            dir="rtl"
          >
            <div className="text-slate-400">{shownCell.label}{shownCell.night ? " · ليل" : ""}</div>
            {shownCell.soc === null ? (
              <div>مضى</div>
            ) : (
              <div className="flex items-center gap-1.5">
                البطارية نحو <bdi dir="ltr">{Math.round(shownCell.soc)}%</bdi>
                <AmpPill tone="emerald" unit="Ah" amps={ah(shownCell.soc)} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500" dir="rtl">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: OK }} />مستوى جيد</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: LOW }} />قريب من الاحتياطي</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-100" />ليل</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-amber-500" />الاحتياطي <bdi dir="ltr">{reservePct}%</bdi></span>
      </div>
      <p className="text-[11px] font-semibold text-slate-400">كل عمود = ساعتان، معبّأ حتى نسبة البطارية المتوقعة في آخرها. الأمبير·ساعة محسوبة على جهد البطارية.</p>
    </div>
  );
}
