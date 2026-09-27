import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { BottomNav, DesktopNav } from "@/components/bottom-nav";
import LogoutButton from "@/components/logout-button";

export const metadata: Metadata = {
  metadataBase: new URL("https://shamsak-nine.vercel.app"),
  title: "شمسك ☀️",
  description: "إدارة ومراقبة الطاقة الشمسية في منزلك",
  robots: { index: false, follow: false },
  openGraph: {
    title: "شمسك ☀️",
    description: "إدارة ومراقبة الطاقة الشمسية في منزلك",
    url: "https://shamsak-nine.vercel.app",
    siteName: "شمسك",
    locale: "ar_LB",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen w-full text-slate-900 antialiased">
        <div className="min-h-screen w-full bg-slate-50">
          <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-2.5" aria-label="شمسك">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 text-xl shadow-sm ring-1 ring-amber-200/70">☀️</span>
                <div className="min-w-0">
                  <div className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">شمسك</div>
                  <div className="hidden text-[10px] font-bold text-slate-400 sm:block">إدارة الطاقة بذكاء</div>
                </div>
              </div>
              <LogoutButton />
            </div>
            <div className="mx-auto max-w-5xl px-4 pb-3 sm:px-6">
              <DesktopNav />
            </div>
          </header>

          <main className="mx-auto min-h-[calc(100vh-120px)] w-full max-w-3xl px-3 py-4 pb-28 sm:px-5 sm:py-6 md:pb-8">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
