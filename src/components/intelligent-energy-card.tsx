"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, CheckCircle2, ChevronDown, Lightbulb, Sparkles, Sun } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { analyzeEnergy } from "@/lib/intelligent-energy";

export function IntelligentEnergyCard({ snapshot }: { snapshot: EnergySnapshot | null }) {
  const [open, setOpen] = useState(false);
  const insight = useMemo(() => (snapshot ? analyzeEnergy(snapshot) : null), [snapshot]);

  if (!insight) return null;

  const tone = {
    green: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", title: "text-emerald-900" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", title: "text-amber-900" },
    red: { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-600", title: "text-rose-900" },
    blue: { bg: "bg-sky-50", border: "border-sky-200", icon: "text-sky-600", title: "text-sky-900" },
  }[insight.tone];

  const Icon = insight.tone === "green" ? CheckCircle2 : insight.tone === "red" ? AlertTriangle : insight.tone === "amber" ? BatteryCharging : Sun;

  return (
    <section className={`energy-card overflow-hidden border ${tone.border} ${tone.bg}`} dir="rtl" aria-label="التحليل الذكي للطاقة">
      <div className="flex items-start gap-3 p-4">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 ${tone.icon}`}>
          <Sparkles size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black ${tone.title}`}>تحليل شمسك الذكي</span>
            <Icon size={16} className={tone.icon} aria-hidden="true" />
          </div>
          <h2 className={`mt-1 text-base font-black ${tone.title}`}>{insight.title}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{insight.summary}</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-black text-slate-700">
            <Lightbulb size={15} className="text-amber-500" />
            <span>{insight.action}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between border-t border-black/5 bg-white/45 px-4 py-3 text-xs font-black text-slate-600 transition hover:bg-white/70"
        aria-expanded={open}
      >
        <span>{open ? "إخفاء التفاصيل" : "لماذا يقول شمسك ذلك؟"}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-black/5 bg-white/45 px-4 pb-4 pt-3">
          <ul className="space-y-2 text-xs font-semibold leading-5 text-slate-600">
            {insight.details.map((detail) => <li key={detail} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{detail}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
