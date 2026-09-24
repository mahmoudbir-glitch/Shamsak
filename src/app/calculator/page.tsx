'use client';

import React, { useState } from 'react';
import { calculateSolarSystem } from '@/lib/calculator';

export default function CalculatorPage() {
  const [consumption, setConsumption] = useState(25);
  const [outage, setOutage] = useState(8);

  const result = calculateSolarSystem({
    dailyConsumptionKwh: Number(consumption),
    outageHours: Number(outage),
    roofAreaM2: 0,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">حاسبة الاحتياج الشمسية الخاصة</h2>
        <p className="mt-1 text-sm text-slate-400">حساب تقديري خاص لنظامك دون أي اتصال بمتاجر أو أطراف خارجية.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div>
          <label htmlFor="consumption" className="mb-1 block text-sm text-slate-300">الاستهلاك اليومي التقريبي (كيلوواط/ساعة):</label>
          <input id="consumption" type="number" inputMode="decimal" min="0" max="1000" step="0.1" value={consumption} onChange={(e) => setConsumption(Math.min(1000, Math.max(0, Number(e.target.value) || 0)))} className="w-full rounded border border-slate-800 bg-slate-950 p-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
        </div>
        <div>
          <label htmlFor="outage" className="mb-1 block text-sm text-slate-300">ساعات انقطاع الكهرباء اليومية:</label>
          <input id="outage" type="number" inputMode="decimal" min="0" max="24" step="0.5" value={outage} onChange={(e) => setOutage(Math.min(24, Math.max(0, Number(e.target.value) || 0)))} className="w-full rounded border border-slate-800 bg-slate-950 p-2 text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 sm:gap-4">
        {Object.entries(result.plans).map(([key, plan]) => (
          <article key={key} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-bold text-amber-400">{plan.title}</h3>
            <p className="text-sm text-slate-300">قدرة الألواح: <span className="font-bold">{plan.solarKw} kW</span></p>
            <p className="text-sm text-slate-300">سعة البطارية: <span className="font-bold">{plan.batteryKwh} kWh</span></p>
            <p className="pt-2 text-xs text-slate-500">حفظ الخطة يتطلب ربط حسابك بقاعدة البيانات.</p>
          </article>
        ))}
      </div>
    </div>
  );
}
