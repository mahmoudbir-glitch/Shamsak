"use client";

import React from "react";
import { Sun } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

const nav = [
  ["/", "الرئيسية"],
  ["/home", "المنزل"],
  ["/battery", "البطارية"],
  ["/energy", "الطاقة"],
  ["/money", "المال"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="/" aria-label="شمسك — الصفحة الرئيسية" className="flex shrink-0 items-center gap-2 font-extrabold text-slate-900">
            <Sun aria-hidden="true" size={22} className="text-amber-500" />
            <span>شمسك</span>
          </a>
          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 md:flex">
            {nav.map(([href, label]) => (
              <a key={href} href={href} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                {label}
              </a>
            ))}
            <a href="/settings" className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">الإعدادات</a>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <a href="/settings" className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">الإعدادات</a>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 md:py-6 safe-bottom">{children}</main>
      <BottomNav />
    </>
  );
}
