"use client";

import React, { useId, useMemo, useState } from "react";
import type { DayForecast } from "@/lib/smart-forecast";

const W = 640;
const H = 190;
const PAD = { top: 14, right: 8, bottom: 30, left: 42 };
const LINE = "#10b981";
const FULL = "#059669";
const NIGHT = "#e0e7ff";

const hourOf = (iso: string) => Number(iso.slice(11, 13)) + Number(iso.slice(14, 16) || 0) / 60;

/**
 * Battery level forecast across the next few days as one continuous line.
 * Nights are shaded, a green dot marks when the battery is expected to be
 * full, and the dashed line is the reserve. Tap anywhere to read a value.
 */
export function ForecastSocTimeline({ forecasts, reservePct, days = 4 }: { forecasts: DayForecast[]; reservePct: number; days?: number }) {
  const gradientId = useId().replace(/:/g, "");
  const [active, setActive] = useState<{ x: number; y: number; label: string; soc: number } | null>(null);
  const shown = forecasts.slice(0, days);
  const totalHours = shown.length * 24;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (h: number) => PAD.left + (h / totalHours) * plotW;
  const y = (soc: number) => PAD.top + (1 - Math.max(0, Math.min(100, soc)) / 100) * plotH;

  const points = useMemo(
    () =>
      shown.flatMap((day, i) =>
        day.hourly
          .filter((p) => typeof p.socPct === "number")
          // the level is at the end of the hour
          .map((p) => ({ h: i * 24 + hourOf(p.time) + 1, soc: p.socPct as number, time: p.time, label: day.label })),
      ),
    [shown],
  );

  if (points.length < 2) return null;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.h).toFixed(1)},${y(p.soc).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points[points.length - 1].h).toFixed(1)},${y(0)} L${x(points[0].h).toFixed(1)},${y(0)} Z`;

  // Night bands: before the first sunrise, then from each sunset to the next sunrise.
  const nights: Array<[number, number]> = [];
  shown.forEach((day, i) => {
    if (i === 0 && day.sunrise) nights.push([0, hourOf(day.sunrise)]);
    if (day.sunset) {
      const next = shown[i + 1]?.sunrise;
      nights.push([i * 24 + hourOf(day.sunset), next ? (i + 1) * 24 + hourOf(next) : totalHours]);
    }
  });

  const fullDots = shown
    .map((day, i) => (day.fullChargeTime ? { h: i * 24 + hourOf(day.fullChargeTime), time: day.fullChargeTime.slice(11, 16), label: day.label } : null))
    .filter((d): d is { h: number; time: string; label: string } => d !== null && d.h >= points[0].h - 1);

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best = points[0];
    for (const p of points) if (Math.abs(x(p.h) - px) < Math.abs(x(best.h) - px)) best = p;
    const hour = Math.floor(((best.h - 1) % 24 + 24) % 24);
    setActive({ x: x(best.h), y: y(best.soc), label: `${best.label} ${String(hour).padStart(2, "0")}:00`, soc: best.soc });
  };

  return (
    <div className="space-y-2">
      <div className="relative" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-none select-none" role="img" aria-label="توقع نسبة البطارية خلال الأيام القادمة" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setActive(null)}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE} stopOpacity="0.22" />
              <stop offset="100%" stopColor={LINE} stopOpacity="0" />
            </linearGradient>
          </defs>

          {nights.map(([a, b], i) => (
            <rect key={i} x={x(a)} y={PAD.top} width={Math.max(0, x(b) - x(a))} height={plotH} fill={NIGHT} opacity={0.55} rx={3} />
          ))}

          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#94a3b8">{v}%</text>
            </g>
          ))}

          {/* day dividers and labels */}
          {shown.map((day, i) => (
            <g key={day.date}>
              {i > 0 && <line x1={x(i * 24)} x2={x(i * 24)} y1={PAD.top} y2={PAD.top + plotH} stroke="#cbd5e1" strokeDasharray="2 4" />}
              <text x={x(i * 24 + 12)} y={H - 10} textAnchor="middle" fontSize={12} fontWeight={700} fill="#64748b">{day.label}</text>
            </g>
          ))}

          <line x1={PAD.left} x2={W - PAD.right} y1={y(reservePct)} y2={y(reservePct)} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.2} />

          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke={LINE} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />

          {fullDots.map((d) => (
            <circle key={d.label} cx={x(d.h)} cy={y(100)} r={5} fill={FULL} stroke="white" strokeWidth={2} />
          ))}

          {active && (
            <g>
              <line x1={active.x} x2={active.x} y1={PAD.top} y2={PAD.top + plotH} stroke="#94a3b8" strokeDasharray="3 3" />
              <circle cx={active.x} cy={active.y} r={4.5} fill={LINE} stroke="white" strokeWidth={2} />
            </g>
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-md"
            style={{ left: `${Math.min(68, Math.max(2, (active.x / W) * 100 - 14))}%` }}
            dir="rtl"
          >
            <div className="text-slate-400">{active.label}</div>
            <div>البطارية نحو <bdi dir="ltr">{Math.round(active.soc)}%</bdi></div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500" dir="rtl">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FULL }} />تمتلئ</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: NIGHT }} />الليل</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-amber-500" />حد الاحتياطي <bdi dir="ltr">{reservePct}%</bdi></span>
      </div>
    </div>
  );
}
