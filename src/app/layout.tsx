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
      <body className="min-h-screen bg-gray-100 text-slate-900 antialiased">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <a href="/" className="flex shrink-0 items-center gap-2 font-extrabold text-slate-900" aria-label="شمسك — الصفحة الرئيسية">
              <span aria-hidden="true" className="text-xl">☀️</span>
              <span>شمسك</span>
            </a>
            <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 md:flex">
              {nav.map(([href, label]) => (
                <a key={href} href={href} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 md:py-6 safe-bottom">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
