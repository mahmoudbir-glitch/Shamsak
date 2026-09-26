import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

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
          <header className="w-full border-b border-slate-200/70 bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-2xl items-center justify-start px-4 py-3 sm:px-6">
              <div className="text-xl font-bold text-amber-500" dir="rtl">
                شمسك ☀️
              </div>
            </div>
          </header>

          <main className="min-h-screen w-full max-w-2xl mx-auto px-4 py-5 safe-bottom flex-1">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
