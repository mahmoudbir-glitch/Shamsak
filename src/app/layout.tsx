import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://shamsak-steel.vercel.app"),
  title: "شمسك",
  description: "إدارة ومراقبة الطاقة الشمسية في منزلك",
  robots: { index: false, follow: false },
  openGraph: {
    title: "شمسك",
    description: "إدارة ومراقبة الطاقة الشمسية في منزلك",
    url: "https://shamsak-steel.vercel.app",
    siteName: "شمسك",
    locale: "ar_LB",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-100 text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
