"use client";

import React, { useState } from 'react';

export default function MoneyDashboard() {
  const [totalSaved, setTotalSaved] = useState<number>(6209); 
  const [gridPaid, setGridPaid] = useState<number>(221.2); 
  const [estimatedCost, setEstimatedCost] = useState<number>(6472.2); 

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800">⚡ الطاقة والمال</h1>
        <div className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">تغطية 61%</div>
      </div>

      {/* الفلتر الزمني */}
      <div className="grid grid-cols-3 gap-2 bg-slate-200 bg-opacity-60 p-1 rounded-xl mb-6 text-center text-xs font-bold text-slate-600">
        <div className="py-2 rounded-lg">يوم</div>
        <div className="py-2 rounded-lg">أسبوع</div>
        <div className="bg-slate-900 text-white py-2 rounded-lg shadow-sm">شهر</div>
      </div>

      {/* شريط نسب التغذية */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
        <h3 className="font-bold text-sm text-slate-700 mb-3"> من أين تأتي كهرباء منزلك؟</h3>
        <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden mb-4">
          <div className="bg-amber-500 h-full" style={{ width: '49%' }}></div>
          <div className="bg-emerald-500 h-full" style={{ width: '49%' }}></div>
          <div className="bg-purple-500 h-full" style={{ width: '2%' }}></div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span>☀️ من الشمس</span><span className="font-bold">49% (227.5 ك.و.س)</span></div>
          <div className="flex justify-between"><span>🔋 من البطارية</span><span className="font-bold">49% (224.9 ك.و.س)</span></div>
          <div className="flex justify-between"><span>🛜 من الشبكة</span><span className="font-bold">2% (7 ك.و.س)</span></div>
        </div>
      </div>

      {/* تفصيل التوفير المالي */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h3 className="font-bold text-sm text-slate-700 mb-1">🪙 التحليل المالي التقديري</h3>
        <p className="text-xs text-slate-400 mb-4">لولا نظامك الشمسي لدفعت {estimatedCost.toLocaleString()} ل.س للشبكة.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
            <span className="text-xs text-emerald-700 block mb-1">وفرت بنظامك</span>
            <span className="text-base font-black text-emerald-600">{totalSaved.toLocaleString()} ل.س</span>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-center">
            <span className="text-xs text-amber-700 block mb-1">دفعت للشبكة</span>
            <span className="text-base font-black text-amber-700">{gridPaid.toLocaleString()} ل.س</span>
          </div>
        </div>
      </div>
    </div>
  );
}
