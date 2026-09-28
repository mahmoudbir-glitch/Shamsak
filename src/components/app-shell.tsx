"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BottomNav, DesktopNav } from "@/components/bottom-nav";
import LogoutButton from "@/components/logout-button";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/92 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2" aria-label="شمسك">
            <span className="flex shrink-0 items-center justify-center text-[2rem] leading-none sm:text-[2.15rem]" aria-hidden="true">☀️</span>
            <div className="min-w-0 leading-none">
              <div className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">شمسك</div>
              <div className="mt-1 text-[10px] font-black leading-tight text-slate-950 sm:text-[11px]">الشمس تعمل من أجلك</div>
            </div>
          </div>
          <LogoutButton />
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-3 sm:px-6"><DesktopNav /></div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-120px)] w-full max-w-3xl px-3 py-4 pb-28 sm:px-5 sm:py-6 md:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
