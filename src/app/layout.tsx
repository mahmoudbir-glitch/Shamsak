import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import AppShell from "@/components/app-shell";

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

const INITIAL_BACKGROUND = "#f8fafc";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" style={{ backgroundColor: INITIAL_BACKGROUND }}>
      <body
        className="min-h-screen w-full bg-[#f8fafc] text-slate-900 antialiased"
        style={{ backgroundColor: INITIAL_BACKGROUND }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
