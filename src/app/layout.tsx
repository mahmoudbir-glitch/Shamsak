import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { BottomNav } from '@/components/bottom-nav';

export const metadata: Metadata = {
  metadataBase: new URL('https://shamsak-steel.vercel.app'),
  title: 'شمسك الخاص — Shamsak',
  description: 'لوحة عربية خاصة لمراقبة الطاقة الشمسية المنزلية',
  robots: { index:false, follow:false },
  openGraph: {
    title:'شمسك الخاص — Shamsak',
    description:'مراقبة الطاقة الشمسية المنزلية',
    url:'https://shamsak-steel.vercel.app',
    siteName:'شمسك الخاص',
    locale:'ar_LB',
    type:'website'
  }
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ar" dir="rtl">
    <body className="min-h-screen bg-gray-100 text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="font-extrabold text-slate-900">☀️ شمسك الخاص</a>
          <a href="/settings" className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">الإعدادات</a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 md:py-6 safe-bottom">{children}</main>
      <BottomNav />
    </body>
  </html>;
}