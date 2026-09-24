import React from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">لوحة التحكم الخاصة بالطاقة</h2>
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs">
          النظام يعمل بشكل طبيعي
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-sm">الإنتاج اللحظي (الشمس)</span>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">6.8 <span className="text-sm font-normal text-slate-300">kW</span></p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-sm">الاستهلاك اللحظي (المنزل)</span>
          <p className="text-3xl font-extrabold text-sky-400 mt-2">3.2 <span className="text-sm font-normal text-slate-300">kW</span></p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-sm">شحن البطارية</span>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">94% <span className="text-sm font-normal text-slate-300">(جاري الشحن)</span></p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-sm">السحب من الشبكة</span>
          <p className="text-3xl font-extrabold text-orange-400 mt-2">0.5 <span className="text-sm font-normal text-slate-300">kW</span></p>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <h3 className="text-lg font-semibold mb-4">تدفق الطاقة المباشر</h3>
        <div className="flex flex-col md:flex-row items-center justify-around gap-6 p-8 bg-slate-950/50 rounded-lg border border-slate-800/80">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-2 border border-amber-500/30">☀️</div>
            <p className="font-bold">الألواح الشمسية</p>
            <p className="text-xs text-slate-400">6.8 kW</p>
          </div>
          <div className="text-amber-400 text-xl font-bold animate-pulse">➡️</div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto mb-2 border border-emerald-500/30">🔋</div>
            <p className="font-bold">البطاريات</p>
            <p className="text-xs text-slate-400">8.9 kW شحن</p>
          </div>
          <div className="text-sky-400 text-xl font-bold animate-pulse">➡️</div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-2xl mx-auto mb-2 border border-sky-500/30">🏠</div>
            <p className="font-bold">استهلاك المنزل</p>
            <p className="text-xs text-slate-400">3.2 kW</p>
          </div>
        </div>
      </div>
    </div>
  );
}
