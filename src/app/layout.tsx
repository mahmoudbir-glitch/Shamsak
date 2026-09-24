import React from 'react';
import './globals.css';

export const metadata = {
  title: 'شمسك الخاص — Shamsak Private',
  description: 'لوحة التحكم الخاصة لنظام الطاقة الشمسية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans">
        <header className="border-b border-slate-800 bg-slate-900/80 p-4 sticky top-0 z-50 backdrop-blur">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-amber-400">☀️ شمسك الخاص</h1>
            <nav className="flex gap-4 text-sm text-slate-300">
              <a href="/" className="hover:text-amber-400">الرئيسية</a>
              <a href="/calculator" className="hover:text-amber-400">الحاسبة</a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
