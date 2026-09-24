import React from 'react';

const metrics = [
  { label: 'الإنتاج اللحظي (الشمس)', value: '6.8', unit: 'kW', color: 'text-amber-400' },
  { label: 'الاستهلاك اللحظي (المنزل)', value: '3.2', unit: 'kW', color: 'text-sky-400' },
  { label: 'شحن البطارية', value: '94%', unit: 'جاري الشحن', color: 'text-emerald-400' },
  { label: 'السحب من الشبكة', value: '0.5', unit: 'kW', color: 'text-orange-400' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-xl font-bold sm:text-2xl">لوحة التحكم الخاصة بالطاقة</h2>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
          النظام يعمل بشكل طبيعي
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
            <span className="text-sm text-slate-400">{metric.label}</span>
            <p className={`mt-2 break-words text-2xl font-extrabold sm:text-3xl ${metric.color}`}>
              {metric.value}{' '}
              <span className="text-sm font-normal text-slate-300">{metric.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6" aria-labelledby="energy-flow-title">
        <h3 id="energy-flow-title" className="mb-4 text-lg font-semibold">تدفق الطاقة المباشر</h3>
        <div className="flex flex-col items-center justify-around gap-5 rounded-lg border border-slate-800/80 bg-slate-950/50 p-5 sm:p-8 md:flex-row md:gap-6">
          <div className="text-center">
            <div aria-hidden="true" className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/20 text-2xl text-amber-400 sm:h-16 sm:w-16">☀️</div>
            <p className="font-bold">الألواح الشمسية</p>
            <p className="text-xs text-slate-400">6.8 kW</p>
          </div>
          <div aria-hidden="true" className="rotate-90 text-xl font-bold text-amber-400 md:rotate-0">➡️</div>
          <div className="text-center">
            <div aria-hidden="true" className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20 text-2xl text-emerald-400 sm:h-16 sm:w-16">🔋</div>
            <p className="font-bold">البطاريات</p>
            <p className="text-xs text-slate-400">8.9 kW شحن</p>
          </div>
          <div aria-hidden="true" className="rotate-90 text-xl font-bold text-sky-400 md:rotate-0">➡️</div>
          <div className="text-center">
            <div aria-hidden="true" className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/20 text-2xl text-sky-400 sm:h-16 sm:w-16">🏠</div>
            <p className="font-bold">استهلاك المنزل</p>
            <p className="text-xs text-slate-400">3.2 kW</p>
          </div>
        </div>
      </section>
    </div>
  );
}
