import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import LogoutButton from "@/components/logout-button";

export const metadata: Metadata = {
  metadataBase: new URL("https://shamsak-steel.vercel.app"),
  title: "شمسك ☀️",
  description: "إدارة ومراقبة الطاقة الشمسية في منزلك",
  robots: { index: false, follow: false },
  openGraph: {
    title: "شمسك ☀️",
    description: "إدارة ومراقبة الطاقة الشمسية في منزلك",
    url: "https://shamsak-steel.vercel.app",
    siteName: "شمسك",
    locale: "ar_LB",
    type: "website",
  },
};

const nav = [
  ["/", "الرئيسية"],
  ["/home", "المنزل"],
  ["/battery", "البطارية"],
  ["/energy", "الطاقة"],
  ["/money", "المال"],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen w-full text-slate-900 antialiased">
        <div className="min-h-screen w-full bg-slate-50 flex flex-col">
          <header className="z-50 flex w-full items-center justify-between px-4 pt-4 pb-2 border-b border-slate-200/70 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-2" dir="rtl" aria-label="شمسك">
              <span className="text-2xl font-black tracking-tight text-amber-500 sm:text-3xl">
                شمسك
              </span>
              <span className="text-2xl animate-spin-slow sm:text-3xl" aria-hidden="true">
                ☀️
              </span>
            </div>
            <LogoutButton />
          </header>

          <main className="min-h-screen w-full max-w-2xl mx-auto px-4 py-5 safe-bottom flex-1">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
