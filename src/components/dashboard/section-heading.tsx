import React from "react";

/** Numbered section label so every block on the home page reads like a sheet in a drawing set. */
export function SectionHeading({ index, title, hint, id }: { index: string; title: string; hint?: string; id?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 px-1">
      <span className="flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-slate-900 px-1.5 font-mono text-[11px] font-bold tracking-wider text-white" aria-hidden="true">
        {index}
      </span>
      <h2 id={id} className="shrink-0 text-sm font-black text-slate-900">{title}</h2>
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
      {hint && <span className="shrink-0 text-[11px] font-bold text-slate-400">{hint}</span>}
    </div>
  );
}
