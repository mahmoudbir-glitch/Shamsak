'use client';
import React, { useState } from 'react';
import { calculateSolarSystem } from '@/lib/calculator';

export default function CalculatorPage() {
  const [consumption, setConsumption] = useState(25);
  const [outage, setOutage] = useState(8);
  const [area, setArea] = useState(50);

  const result = calculateSolarSystem({
    dailyConsumptionKwh: Number(consumption),
    outageHours: Number(outage),
    roofAreaM2: Number(area)
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">حاسبة الاحتياج الشمسية الخاصة</h2>
        <p className="text-slate-400 text-sm">حساب تقديري خاص لنظامك دون أي اتصال بمتاجر أو أطراف خارجية.</p>
      </div>

      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">الاستهلاك اليومي التقريبي (كيلوواط/ساعة):</label>
          <input type="number" value={consumption} onChange={e => setConsumption(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">ساعات انقطاع الكهرباء اليومية:</label>
          <input type="number" value={outage} onChange={e => setOutage(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(result.plans).map(([key, plan]) => (
          <div key={key} className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-bold text-amber-400 text-lg">{plan.title}</h3>
            <p className="text-sm text-slate-300">قدرة الألواح: <span className="font-bold">{plan.solarKw} kW</span></p>
            <p className="text-sm text-slate-300">سعة البطارية: <span className="font-bold">{plan.batteryKwh} kWh</span></p>
            <button onClick={() => alert('تم حفظ الخطة في حسابك الخاص')} className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded border border-slate-700">حفظ الخطة الخاصة</button>
          </div>
        ))}
      </div>
    </div>
  );
}
