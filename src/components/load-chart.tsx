"use client";

import React, { useMemo, useState } from "react";

export type LoadPoint = { t: number; loadW: number; solarW: number };

const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };
const GAP_MS = 25 * 60_000; // أكثر من هذا بين نقطتين = فجوة لا نصل عبرها الخط

function niceMax(value: number) {
  const kw = Math.max(0.5, value / 1000);
  const step = kw <= 1 ? 0.25 : kw <= 3 ? 0.5 : kw <= 6 ? 1 : 2;
  return Math.ceil(kw / step) * step * 1000;
}

/** يقسّم النقاط إلى مقاطع متصلة حتى تظهر فترات الانقطاع فجوات. */
function segments(points: LoadPoint[]) {
  const out: LoadPoint[][] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && point.t - last[last.length - 1].t <= GAP_MS) last.push(point);
    else out.push([point]);
  }
  return out;
}

/** منحنى آخر 24 ساعة: خط الاستهلاك ومساحة الإنتاج الشمسي، مع مؤشر عند المرور. */
export function LoadChart({ points, timeZone, now }: { points: LoadPoint[]; timeZone: string; now: number }) {
  const [hover, setHover] = useState<LoadPoint | null>(null);
  const start = now - 24 * 3_600_000;
  const maxW = niceMax(Math.max(1, ...points.map((p) => Math.max(p.loadW, p.solarW))));

  const x = (t: number) => PAD.left + ((t - start) / (now - start)) * (W - PAD.left - PAD.right);
  const y = (w: number) => PAD.top + (1 - w / maxW) * (H - PAD.top - PAD.bottom);
  const hourLabel = useMemo(
    () => new Intl.DateTimeFormat("ar-LB-u-nu-latn", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    [timeZone],
  );

  // تسميات المحور الأفقي كل 6 ساعات على رأس الساعة.
  const ticks: number[] = [];
  const firstHour = Math.ceil(start / 3_600_000) * 3_600_000;
  for (let t = firstHour; t <= now; t += 3_600_000) {
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(t));
    if (hour % 6 === 0) ticks.push(t);
  }
  const yTicks = [0, maxW / 2, maxW];

  const parts = segments(points);
  const linePath = parts.map((seg) => seg.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.loadW).toFixed(1)}`).join("")).join("");
  const areaPath = parts
    .map((seg) => `M${x(seg[0].t).toFixed(1)},${y(0)}` + seg.map((p) => `L${x(p.t).toFixed(1)},${y(p.solarW).toFixed(1)}`).join("") + `L${x(seg[seg.length - 1].t).toFixed(1)},${y(0)}Z`)
    .join("");

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best: LoadPoint | null = null;
    for (const p of points) if (!best || Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    setHover(best && Math.abs(x(best.t) - px) < 30 ? best : null);
  };

  const kw = (w: number) => (w / 1000).toFixed(w >= 10_000 ? 0 : 2);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-sky-500" />استهلاك المنزل</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-amber-300/70" />الإنتاج الشمسي</span>
      </div>
      <div className="relative" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-none select-none" role="img" aria-label="استهلاك المنزل والإنتاج الشمسي خلال آخر 24 ساعة" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#94a3b8">{kw(v)}</text>
            </g>
          ))}
          <text x={PAD.left - 6} y={PAD.top - 2} textAnchor="end" fontSize={10} fill="#94a3b8">kW</text>
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={11} fill="#94a3b8">{hourLabel.format(t)}</text>
          ))}
          <path d={areaPath} fill="#fcd34d" fillOpacity={0.45} />
          <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover && (
            <g>
              <line x1={x(hover.t)} x2={x(hover.t)} y1={PAD.top} y2={H - PAD.bottom} stroke="#94a3b8" strokeDasharray="3 3" />
              <circle cx={x(hover.t)} cy={y(hover.loadW)} r={4.5} fill="#0ea5e9" stroke="#ffffff" strokeWidth={2} />
            </g>
          )}
          {/* مساحة لمس أكبر من الخطوط نفسها */}
          <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="transparent" />
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute top-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-md"
            style={{ left: `${Math.min(70, Math.max(2, (x(hover.t) / W) * 100 - 15))}%` }}
            dir="rtl"
          >
            <div className="text-slate-400">{hourLabel.format(hover.t)}</div>
            <div>المنزل: {kw(hover.loadW)} kW</div>
            <div>الشمس: {kw(hover.solarW)} kW</div>
          </div>
        )}
      </div>
    </div>
  );
}
