"use client";

import { useMemo, useState } from "react";
import { Activity, BatteryCharging, CheckCircle2, ChevronDown, Gauge, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { recommendLoadAction } from "@/lib/intelligent-energy";
import type { LoadPoint } from "@/components/load-chart";

type SmartEnergySummaryProps = {
  snapshot: EnergySnapshot | null;
  points: LoadPoint[];
  peak: { w: number; at: string } | null;
  inverterRatedKw: number | null;
};

const HOUR_MS = 3_600_000;

function averagePower(points: LoadPoint[]) {
  const values = points.map((point) => Math.max(0, point.loadW)).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function recordedEnergyKWh(points: LoadPoint[], now: number) {
  const sorted = points.filter((point) => point.t <= now).sort((a, b) => a.t - b.t);
  let totalWh = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const hours = (sorted[i].t - sorted[i - 1].t) / HOUR_MS;
    if (hours <= 0 || hours > 0.25) continue;
    totalWh += ((Math.max(0, sorted[i].loadW) + Math.max(0, sorted[i - 1].loadW)) / 2) * hours;
  }
  return totalWh / 1000;
}

export function SmartEnergySummary({ snapshot, points, peak, inverterRatedKw }: SmartEnergySummaryProps) {
  const [open, setOpen] = useState(false);
  const now = Date.now();
  const comparison = useMemo(() => {
    const recent = points.filter((point) => point.t >= now - 24 * HOUR_MS && point.t <= now);
    const averageW = averagePower(recent);
    if (!snapshot || averageW === null || averageW <= 0) return null;
    const differencePct = ((snapshot.homePowerW - averageW) / averageW) * 100;
    return { averageW, differencePct };
  }, [points, snapshot, now]);

  const todayUsage = snapshot?.todayHomeUsageKWh ?? null;
  const recorded24h = useMemo(() => recordedEnergyKWh(points, now), [points, now]);
  const loadDecision = snapshot ? recommendLoadAction(snapshot, 1000) : null;
  const peakPct = peak && inverterRatedKw && inverterRatedKw > 0 ? Math.round((peak.w / (inverterRatedKw * 1000)) * 100) : null;

  const comparisonText = !comparison
    ? "لا توجد بيانات كافية للمقارنة حالياً. سيبدأ شمسك بالمقارنة بعد تجمّع قراءات حية كافية."
    : comparison.differencePct >= 10
      ? `الاستهلاك الآن أعلى من متوسط القراءات المتاحة بنحو ${Math.round(comparison.differencePct)}٪.`
      : comparison.differencePct <= -10
        ? `الاستهلاك الآن أقل من متوسط القراءات المتاحة بنحو ${Math.round(Math.abs(comparison.differencePct))}٪.`
        : "الاستهلاك الآن قريب من متوسط القراءات المتاحة.";

  const TrendIcon = comparison && comparison.differencePct >= 10 ? TrendingUp : TrendingDown;
  const trendClass = comparison && comparison.differencePct >= 10 ? "text-amber-700" : "text-emerald-700";

  return (
    <section dir="rtl" className="overflow-hidden rounded-[20px] border border-indigo-200 bg-indigo-50/70" aria-label="مقارنة الاستهلاك والملخص الذكي">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600">
            <Activity size={19} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-indigo-950">مقارنة الاستهلاك</h2>
              {comparison && <TrendIcon size={15} className={trendClass} aria-hidden="true" />}
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">شمسك يقارن القراءة الحالية بما توفر من قراءات حقيقية، من دون اختراع بيانات للأيام غير المسجلة.</p>
            <p className={`mt-2 text-xs font-black ${trendClass}`}>{comparisonText}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/80 px-3 py-2.5">
            <div className="text-[10px] font-bold text-slate-400">استهلاك اليوم</div>
            <div className="mt-1 text-lg font-black text-slate-900">{todayUsage === null ? "—" : `${todayUsage.toFixed(1)} kWh`}</div>
          </div>
          <div className="rounded-2xl bg-white/80 px-3 py-2.5">
            <div className="text-[10px] font-bold text-slate-400">المسجل خلال 24 ساعة</div>
            <div className="mt-1 text-lg font-black text-slate-900">{recorded24h > 0 ? `${recorded24h.toFixed(1)} kWh` : "—"}</div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/80 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><Gauge size={12} /> متوسط القدرة</div>
            <div className="mt-1 text-sm font-black text-slate-900">{comparison ? `${Math.round(comparison.averageW)} W` : "—"}</div>
          </div>
          <div className="rounded-2xl bg-white/80 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><BatteryCharging size={12} /> قرار حمل 1 kW</div>
            <div className="mt-1 text-sm font-black text-slate-900">{loadDecision ? loadDecision.decision === "run" ? "شغّل الآن" : loadDecision.decision === "delay" ? "أجّل" : loadDecision.decision === "avoid" ? "تجنّب" : "غير معروف" : "—"}</div>
          </div>
        </div>

        {peak && (
          <div className="mt-2 rounded-2xl bg-white/80 px-3 py-2.5 text-xs font-bold text-slate-700">
            <span className="font-black text-slate-900">أعلى حمل مسجل:</span> {Math.round(peak.w)} واط{peakPct !== null ? ` — ${peakPct}% من قدرة الإنفرتر` : ""}
          </div>
        )}

        <div className="mt-2 rounded-2xl bg-white/80 px-3 py-2.5 text-xs font-bold leading-5 text-slate-700">
          <Lightbulb size={14} className="mr-1 inline text-amber-500" aria-hidden="true" />
          {loadDecision?.reason || "التوصية ستظهر عندما تتوفر قراءة حية."}
        </div>
      </div>

      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between border-t border-indigo-100 bg-white/50 px-4 py-3 text-xs font-black text-slate-600">
        <span>{open ? "إخفاء الملخص" : "عرض الملخص الذكي"}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-indigo-100 bg-white/40 px-4 pb-4 pt-3 text-xs font-semibold leading-6 text-slate-600">
          <div className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-1 shrink-0 text-emerald-600" /><span>المقارنة الحالية تعتمد على البيانات التي جمعتها المنظومة فعلياً فقط.</span></div>
          <div className="mt-2 flex items-start gap-2"><BatteryCharging size={15} className="mt-1 shrink-0 text-emerald-600" /><span>قرار الحمل الافتراضي هنا لحمل قدرته <bdi dir="ltr">1 kW</bdi>، ويمكن استخدامه كمرجع قبل تشغيل حمل فعلي.</span></div>
          <div className="mt-2 flex items-start gap-2"><TrendingDown size={15} className="mt-1 shrink-0 text-indigo-600" /><span>لا تتم مقارنة الأيام السابقة إلا عندما تصبح بياناتها متاحة؛ لا يتم تقدير يوم كامل من دون سجل حقيقي.</span></div>
        </div>
      )}
    </section>
  );
}
