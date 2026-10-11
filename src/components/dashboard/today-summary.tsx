import React from "react";
import { Leaf, Sun, Zap } from "lucide-react";
import { AmpPill } from "@/components/amp-pill";
import { acAmpHours } from "@/lib/energy";

type Props = { productionKWh?: number; homeUsageKWh?: number; savings?: number; currencyPrefix?: string };

const kwh = (value?: number) => (value === undefined ? "—" : value.toFixed(1));

export function TodaySummary({ productionKWh, homeUsageKWh, savings, currencyPrefix = "$" }: Props) {
  const savingsNegative = (savings ?? 0) < 0;
  const savingsText = savings === undefined ? "—" : (savingsNegative ? "-" : "") + currencyPrefix + Math.abs(savings).toFixed(2);

  const tiles = [
    { key: "production", label: "إنتاج اليوم", icon: Sun, value: kwh(productionKWh), unit: productionKWh === undefined ? "" : "kWh", valueClass: "text-amber-600", bar: "bg-amber-400", iconClass: "bg-amber-50 text-amber-600", pill: <AmpPill tone="amber" unit="Ah" amps={acAmpHours(productionKWh)} /> },
    { key: "usage", label: "استهلاك اليوم", icon: Zap, value: kwh(homeUsageKWh), unit: homeUsageKWh === undefined ? "" : "kWh", valueClass: "text-sky-700", bar: "bg-sky-400", iconClass: "bg-sky-50 text-sky-600", pill: <AmpPill tone="sky" unit="Ah" amps={acAmpHours(homeUsageKWh)} /> },
    { key: "savings", label: "وفر اليوم", icon: Leaf, value: savingsText, unit: "", valueClass: savingsNegative ? "text-rose-600" : "text-emerald-600", bar: savingsNegative ? "bg-rose-400" : "bg-emerald-400", iconClass: savingsNegative ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600", pill: null },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map(({ key, label, icon: Icon, value, unit, valueClass, bar, iconClass, pill }) => (
          <div key={key} className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_6px_20px_rgba(15,23,42,0.04)] sm:p-4">
            <span className={`absolute inset-x-0 top-0 h-1 ${bar}`} aria-hidden="true" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 sm:text-xs">{label}</span>
              <span className={`hidden h-7 w-7 items-center justify-center rounded-lg sm:flex ${iconClass}`} aria-hidden="true"><Icon className="h-4 w-4" /></span>
            </div>
            <div className={`mt-2 flex items-baseline gap-1 font-black tabular-nums ${valueClass}`} dir="ltr">
              <span className="text-lg leading-none sm:text-2xl">{value}</span>
              {unit && <span className="text-[10px] font-extrabold opacity-70 sm:text-xs">{unit}</span>}
            </div>
            <div className="mt-auto pt-2">{pill ?? <span className="block h-[22px]" aria-hidden="true" />}</div>
          </div>
        ))}
      </div>
      {productionKWh === undefined && homeUsageKWh === undefined && (
        <p className="mt-2 px-1 text-[11px] font-semibold text-slate-400">تُحسب أرقام اليوم تلقائياً مع تجمّع القراءات.</p>
      )}
    </div>
  );
}
