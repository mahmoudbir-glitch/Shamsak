import React from "react";

const TONES = {
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
} as const;

/**
 * Current in amps as a small capsule in the source's colour. Every capsule has
 * the same height and minimum width so rows of them line up.
 */
export function AmpPill({ amps, tone, muted = false, className = "" }: { amps: number | null | undefined; tone: keyof typeof TONES; muted?: boolean; className?: string }) {
  const value = typeof amps === "number" && Number.isFinite(amps) ? Math.abs(amps) : null;
  const text = value === null ? "—" : value >= 100 ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, "");
  return (
    <span
      dir="ltr"
      className={`inline-flex h-[22px] min-w-[3.6rem] items-center justify-center gap-[3px] rounded-full px-2.5 text-xs font-black ring-1 ring-inset ${TONES[tone]} ${muted ? "opacity-50" : ""} ${className}`}
    >
      {text}
      <span className="text-[10px] font-extrabold opacity-70">A</span>
    </span>
  );
}
