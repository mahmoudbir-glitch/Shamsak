"use client";

import React, { useState } from 'react';

export default function SolarDashboard() {
  const [solarProduction] = useState<number>(6800); 
  const [homeConsumption] = useState<number>(3200); 
  const [batteryLevel] = useState<number>(94);         
  const [gridImport] = useState<number>(500);            

  // دالة الحساب الذكية مدمجة بشكل مختصر جداً لمنع تضخم أسطر الملف
  const SAFETY_RESERVE = 10;
  const usableSoc = Math.max(0, batteryLevel - SAFETY_RESERVE);
  const availableWh = 4800 * (usableSoc / 100);
  const hoursRemaining = Math.round((availableWh / (homeConsumption > 0 ? homeConsumption : 150)) * 10) / 10;
  const estimatedSocAtSunrise = Math.max(SAFETY_RESERVE, Math.round(((4800 * (batteryLevel / 100) - (homeConsumption * 10)) / 4800) * 100));

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-24 text-right" dir="rtl">
      
      {/* الهيدر */}
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-2xl mb-6 border border-slate-700">
        <h1 className="text-xl font-black text-amber-400">شمسك</h1>
        <div className="text-xs text-slate-400">مخطط التدفق اللحظي</div>
      </div>

      {/* المخطط التدفقي المبسط */}
      <div className="bg-slate-800 border border-slate-700 rounded-3xl p-4 shadow-xl mb-6 space-y-4">
        <div className="flex justify-center">
          <div className="bg-slate-900 border-2 border-amber-500 p-3 rounded-2xl w-36 text-center">
            <span className="text-xs text-slate-400 block">☀️ الشمس</span>
            <span className="text-base font-black text-amber-400">{(solarProduction / 1000).toFixed(1)} kW</span>
          </div>
        </div>

        <div className="flex justify-between items-center px-2">
          <div className="bg-slate-900 border-2 border-purple-500 p-3 rounded-2xl w-28 text-center">
            <span className="text-[10px] text-slate-400 block">🛜 الشبكة</span>
            <span className="text-sm font-black text-purple-400">{(gridImport / 1000).toFixed(1)} kW</span>
          </div>
          <div className="text-amber-400 font-bold animate-pulse">⚡</div>
          <div className="bg-slate-900 border-2 border-blue-500 p-3 rounded-2xl w-28 text-center">
            <span className="text-[10px] text-slate-400 block">🏠 المنزل</span>
            <span className="text-sm font-black text-blue-400">{(homeConsumption / 1000).toFixed(1)} kW</span>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="bg-slate-900 border-2 border-emerald-500 p-3 rounded-2xl w-40 text-center">
            <span className="text-xs text-slate-400 block">🔋 البطارية</span>
            <span className="text-base font-black text-emerald-400">{batteryLevel}% | 8.9 kW</span>
          </div>
        </div>
      </div>

      {/* صندوق التنبؤ بصمود البطارية */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4">
        <h3 className="font-bold text-amber-400 text-xs mb-2">🌙 صمود البطارية ليلاً</h3>
        <div className="bg-slate-900 p-3 rounded-xl mb-2 text-xs font-bold text-emerald-400">
          ✓ تكفي حتى الصباح • صباحاً نحو {estimatedSocAtSunrise}%
          <p className="text-[10px] font-normal text-slate-400 mt-1">متبقي حوالي {hoursRemaining} ساعة قبل حد الأمان</p>
        </div>
      </div>

      {/* صندوق استغلال الفائض الشمسي */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6">
        <h3 className="font-bold text-blue-400 text-xs mb-1">⚡ استغلال الفائض الشمسي القادم</h3>
        <div className="bg-slate-900 p-3 rounded-xl text-[10px] text-slate-400 leading-relaxed">
          💡 **نصيحة شمسك:** يوصى بتشغيل الأجهزة الكبيرة كـ **(الغسالة أو مضخة المياه)** بين الساعة **12:30 و 17:00** للاستفادة المجانية القصوى من فائض التوليد.
        </div>
      </div>

      {/* القائمة السفلية */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around py-3 text-[10px] text-slate-400 z-50">
        <div className="text-amber-400 font-bold">📊 الرئيسية</div>
        <div className="opacity-60">🏠 المنزل</div>
        <div className="opacity-60">🔋 البطارية</div>
        <div className="opacity-60">☀️ الطاقة</div>
        <div className="opacity-60">💰 المال</div>
      </div>

    </div>
  );
}
