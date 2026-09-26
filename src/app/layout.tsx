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
        <div className="min-h-screen w-full animate-dynamic-bg flex flex-col">
          <main className="min-h-screen w-full max-w-2xl mx-auto px-4 py-6 safe-bottom flex-1">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
