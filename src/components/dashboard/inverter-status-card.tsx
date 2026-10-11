import React from "react";
import { Cpu } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { chargerPriorityLabel, inverterModeLabel, outputPriorityLabel } from "@/lib/energy";

/** Inverter status as the inverter reports it, laid out as a spec sheet. */
export function InverterStatusCard({ snapshot }: { snapshot: EnergySnapshot }) {
  const hot = (snapshot.inverterTemperature ?? 0) >= 60;
  const gridVoltageText = /off.?grid|battery/i.test(snapshot.operatingMode ?? "")
    ? "غير مُقاس (منفصل)"
    : snapshot.gridVoltage !== undefined ? `${Math.round(snapshot.gridVoltage)} V` : "—";

  const specs: Array<[string, string]> = [
    ["أولوية المصدر", outputPriorityLabel(snapshot.outputPriority)],
    ["شحن البطارية", chargerPriorityLabel(snapshot.chargerPriority)],
    ["جهد مدخل الشبكة", gridVoltageText],
  ];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)]" aria-label="حالة الإنفرتر">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100"><Cpu className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900">حالة الإنفرتر</h3>
          <p className="truncate text-[11px] font-bold text-slate-500">{inverterModeLabel(snapshot.operatingMode)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <span className="text-[11px] font-bold text-slate-500">الحمل من قدرته</span>
          <strong className="mt-0.5 block text-xl font-black tabular-nums text-slate-900"><bdi dir="ltr">{snapshot.loadPercent !== undefined ? `${Math.round(snapshot.loadPercent)}%` : "—"}</bdi></strong>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-200">
            {snapshot.loadPercent !== undefined && <span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, Math.max(2, snapshot.loadPercent))}%` }} />}
          </span>
        </div>
        <div className={"rounded-xl border p-3 " + (hot ? "border-rose-100 bg-rose-50" : "border-slate-100 bg-slate-50")}>
          <span className="text-[11px] font-bold text-slate-500">الحرارة</span>
          <strong className={"mt-0.5 block text-xl font-black tabular-nums " + (hot ? "text-rose-600" : "text-slate-900")}><bdi dir="ltr">{snapshot.inverterTemperature !== undefined ? `${Math.round(snapshot.inverterTemperature)} °C` : "—"}</bdi></strong>
        </div>
      </div>

      <dl className="mt-3 overflow-hidden rounded-xl border border-slate-100 text-[13px]">
        {specs.map(([label, value], i) => (
          <div key={label} className={"flex items-start justify-between gap-3 px-3 py-2.5 " + (i % 2 === 0 ? "bg-white" : "bg-slate-50/70") + (i > 0 ? " border-t border-slate-100" : "")}>
            <dt className="shrink-0 font-bold text-slate-500">{label}</dt>
            <dd className="text-left font-black text-slate-800"><bdi>{value}</bdi></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
