"use client";

import React, { useMemo, useState } from "react";
import type { LoadPoint } from "@/components/load-chart";

const W = 640;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 26, left: 36 };
const GAP_MS = 25 * 60_000;

/** نسبة شحن البطارية خلال آخر 24 ساعة (0–100%)، مع خط حد الاحتياطي ومؤشر عند المرور. */
export function SocChart({ points, timeZone, now, reservePct }: { points: LoadPoint[]; timeZone: string; now: number; reservePct: number }) {
  const [hover, setHover] = useState<LoadPoint | null>(null);
  const data = points.filter((p) => typeof p.soc === "number");
  const start = now - 24 * 3_600_000;
  const x = (t: number) => PAD.left + ((t - start) / (now - start)) * (W - PAD.left - PAD.right);
  const y = (soc: number) => PAD.top + (1 - soc / 100) * (H - PAD.top - PAD.bottom);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat("ar-LB-u-nu-latn", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), [timeZone]);
  const hourFmt = useMemo(() => new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hourCycle: "h23" }), [timeZone]);

  const ticks: number[] = [];
  for (let t = Math.ceil(start / 3_600_000) * 3_600_000; t <= now; t += 3_600_000) if (Number(hourFmt.format(t)) % 6 === 0) ticks.push(t);

  let path = "";
  data.forEach((p, i) => {
    const jump = i === 0 || p.t - data[i - 1].t > GAP_MS;
    path += `${jump ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.soc!).toFixed(1)}`;
  });

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best: LoadPoint | null = null;
    for (const p of data) if (!best || Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    setHover(best && Math.abs(x(best.t) - px) < 30 ? best : null);
  };

  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-none select-none" role="img" aria-label="نسبة شحن البطارية خلال آخر 24 ساعة" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#94a3b8">{v}%</text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(reservePct)} y2={y(reservePct)} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
        <text x={W - PAD.right} y={y(reservePct) - 4} textAnchor="end" fontSize={10} fill="#b45309">الاحتياطي {reservePct}%</text>
        {ticks.map((t) => <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={11} fill="#94a3b8">{timeFmt.format(t)}</text>)}
        <path d={path} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover && (
          <g>
            <line x1={x(hover.t)} x2={x(hover.t)} y1={PAD.top} y2={H - PAD.bottom} stroke="#94a3b8" strokeDasharray="3 3" />
            <circle cx={x(hover.t)} cy={y(hover.soc!)} r={4.5} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
          </g>
        )}
        <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="transparent" />
      </svg>
      {hover && (
        <div className="pointer-events-none absolute top-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-md" style={{ left: `${Math.min(70, Math.max(2, (x(hover.t) / W) * 100 - 15))}%` }} dir="rtl">
          <div className="text-slate-400">{timeFmt.format(hover.t)}</div>
          <div>الشحن: {hover.soc}%</div>
          {typeof hover.batteryW === "number" && <div>{hover.batteryW >= 0 ? "شحن" : "تفريغ"}: {Math.abs(hover.batteryW)} واط</div>}
        </div>
      )}
    </div>
  );
}
