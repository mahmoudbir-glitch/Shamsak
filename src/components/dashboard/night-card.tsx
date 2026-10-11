import React from "react";
import Link from "next/link";
import { ChevronLeft, Moon } from "lucide-react";

export function NightCard({ text }: { text: string }) {
  return (
    <Link href="/energy#night" className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition hover:border-indigo-200 hover:shadow-md">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 ring-1 ring-inset ring-indigo-100"><Moon className="h-5 w-5" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-900">الليلة: هل تكفي البطارية؟</span>
        <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">{text}</span>
      </span>
      <ChevronLeft className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:-translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
