import React from "react";
import { AmpPill } from "@/components/amp-pill";

const TONES = {
  amber: { bg: "bg-amber-50", text: "text-amber-700" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
  sky: { bg: "bg-sky-50", text: "text-sky-700" },
  rose: { bg: "bg-rose-50", text: "text-rose-700" },
  slate: { bg: "bg-slate-50", text: "text-slate-900" },
} as const;

export type StatTone = keyof typeof TONES;

/**
 * The summary tile used on the energy page: a tinted rounded box with a small
 * grey label and a bold value. `big` tiles (text-2xl) lead; plain slate tiles
 * (text-lg) carry the secondary numbers.
 */
export function StatTile({ label, value, unit, tone = "slate", big = false, amps, ampTone }: { label: string; value: string; unit?: string; tone?: StatTone; big?: boolean; amps?: number | null; ampTone?: "sky" | "amber" | "emerald" | "violet" }) {
  const t = TONES[tone];
  return (
    <div className={`rounded-2xl p-4 ${t.bg}`}>
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <strong className={`mt-1 block whitespace-nowrap font-black ${big ? "text-2xl" : "text-lg"} ${t.text}`}>
        <bdi dir="ltr">{value}</bdi>
        {unit && <small className="text-sm"> {unit}</small>}
      </strong>
      {ampTone && <span className="mt-1.5 block"><AmpPill tone={ampTone} amps={amps} /></span>}
    </div>
  );
}
