import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://shamsak-steel.vercel.app'),
  title: 'شمسك الخاص — Shamsak Private',
  description: 'لوحة التحكم الخاصة لنظام الطاقة الشمسية',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'شمسك الخاص — Shamsak Private',
    description: 'لوحة التحكم الخاصة لنظام الطاقة الشمسية',
    url: 'https://shamsak-steel.vercel.app',
    siteName: 'شمسك الخاص',
    locale: 'ar_LB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'شمسك الخاص — Shamsak Private',
    description: 'لوحة التحكم الخاصة لنظام الطاقة الشمسية',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 font-sans antialiased">
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 px-3 py-3 backdrop-blur sm:px-4">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-amber-400 sm:text-xl">☀️ شمسك الخاص</h1>
            <nav aria-label="التنقل الرئيسي" className="flex items-center gap-3 text-sm text-slate-300 sm:gap-4">
              <a href="/" className="rounded px-2 py-1.5 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400">الرئيسية</a>
              <a href="/calculator" className="rounded px-2 py-1.5 hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400">الحاسبة</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-6">{children}</main>
      </body>
    </html>
  );
}
