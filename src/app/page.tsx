"use client";

import React, { useState } from 'react';

export default function SolarDashboard() {
  // القراءات الحية المتطابقة تماماً مع قيم المخطط الدائري في صورتك الأخيرة
  const [solarProduction] = useState<number>(5830); // 5.83 kW الشمس
  const [homeConsumption] = useState<number>(1300); // 1.30 kW المنزل
  const [batteryLevel] = useState<number>(78);         // 78% البطارية
  const [batteryPower] = useState<number>(4980);    // 4.98 kW قدرة الشحن
  const [gridPower] = useState<number>(450);        // 0.45 kW الشبكة

  // حسابات الصمود التنبؤية الذكية للبطارية المبسطة
  const SAFETY_RESERVE = 10;
  const usableSoc = Math.max(0, batteryLevel - SAFETY_RESERVE);
  const availableWh = 4800 * (usableSoc / 100);
  const hoursRemaining = Math.round((availableWh / (homeConsumption > 0 ? homeConsumption : 150)) * 10) / 10;
  const estimatedSocAtSunrise = Math.max(SAFETY_RESERVE, Math.round(((4800 * (batteryLevel / 100) - (homeConsumption * 10)) / 4800) * 100));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 pb-24 text-right relative overflow-x-hidden" dir="rtl">
      
      {/* ستايل حركة نقاط تدفق الطاقة داخل خطوط الأقواس الدائرية المنقطة */}
      <style>{`
        @keyframes strokeAnimation {
          to { stroke-dashoffset: -20; }
        }
        .flow-arc-active {
          stroke-dasharray: 6, 4;
          animation: strokeAnimation 1.5s linear infinite;
        }
      `}</style>

      {/* الهيدر العلوي الأبيض النظيف */}
      <div className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm mb-4 relative z-20">
        <h1 className="text-sm font-black text-amber-500 flex items-center gap-1">
          شمسك ☀️
        </h1>
        <button className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-xl font-bold border border-slate-200">
          الإعدادات
        </button>
      </div>

      {/* المخطط الدائري الرئيسي المفتوح والمطابق تماماً للصورة الأخيرة */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-4 relative min-h-[440px] flex flex-col justify-between">
        
        {/* شارة وضع العرض التجريبي وشارة التصدير */}
        <div className="flex justify-between items-center relative z-20">
          <span className="text-[10px] bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-black">DEMO</span>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">● حالة النظام الآن</span>
        </div>

        {/* شبكة الأقواس والمسارات الدائرية المنقطة والمتحركة بدقة هندسية متناهية خلف الكروت */}
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center p-4">
          <svg className="w-full h-full max-h-[380px]" viewBox="0 0 400 380" fill="none" xmlns="http://w3.org">
            {/* القوس العلوي الأيمن: من الألواح الشمسية نزولاً إلى المنزل */}
            <path d="M 230 90 A 110 110 0 0 1 310 190" stroke="#ea580c" strokeWidth="2.5" className="flow-arc-active" />
            
            {/* القوس السفلي الأيمن: من المنزل نزولاً إلى البطارية */}
            <path d="M 310 230 A 110 110 0 0 1 230 310" stroke="#059669" strokeWidth="2" className="flow-arc-active" />
            
            {/* القوس السفلي الأيسر: من البطارية صعوداً إلى الشبكة */}
            <path d="M 170 310 A 110 110 0 0 1 90 230" stroke="#7c3aed" strokeWidth="2.5" className="flow-arc-active" style={{ animationDirection: 'reverse' }} />
            
            {/* القوس العلوي الأيسر المتقطع الاحتياطي بين الشبكة والألواح */}
            <path d="M 90 190 A 110 110 0 0 1 170 90" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* كروت وعقد قراءة البيانات المتوضعة بشكل بيضاوي متناسق تماماً فوق الأقواس */}
        <div className="relative z-10 h-full flex flex-col justify-between space-y-4 my-auto">
          
          {/* 1. عقدة الشمس (أعلى المنتصف) */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-amber-200 bg-amber-50 flex items-center justify-center mb-1 shadow-sm">
              <span className="text-amber-500 text-xl animate-pulse">☀️</span>
            </div>
            <span className="text-[10px] text-slate-400 font-black tracking-wider">SOLAR</span>
            <span className="text-base font-black text-amber-600">kW {(solarProduction / 1000).toFixed(2)}</span>
            <span className="text-[9px] text-slate-400 font-medium">إنتاج حالي</span>
          </div>

          {/* الصف الأوسط: كروت الشبكة والمنزل مع سنتر الوميض */}
          <div className="flex justify-between items-center px-2">
            
            {/* عقدة الشبكة (يسار) */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl border border-purple-100 bg-purple-50 flex items-center justify-center mb-1 shadow-sm">
                <span className="text-purple-500 text-lg">🛜</span>
              </div>
              <span className="text-[9px] text-slate-400 font-black tracking-wider">GRID STATUS</span>
              <span className="text-sm font-black text-purple-600">kW {(gridPower / 1000).toFixed(2)}</span>
              <span className="text-[8px] text-purple-400 font-medium">تصدير إلى الشبكة</span>
            </div>

            {/* نقطة الصاعقة والوميض المركزي لإنفرتر شمسك */}
            <div className="w-10 h-10 rounded-full border border-slate-100 bg-white flex items-center justify-center text-amber-500 shadow-md font-bold text-sm">
              ⚡
            </div>

            {/* عقدة استهلاك المنزل (يمين) */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl border border-blue-100 bg-blue-50 flex items-center justify-center mb-1 shadow-sm">
                <span className="text-blue-500 text-lg">🏠</span>
              </div>
              <span className="text-[9px] text-slate-400 font-black tracking-wider">HOME CONSUMPTION</span>
              <span className="text-sm font-black text-blue-600">kW {(homeConsumption / 1000).toFixed(2)}</span>
              <span className="text-[8px] text-slate-400 font-medium">استهلاك حالي</span>
            </div>

          </div>

          {/* 2. عقدة البطارية ونسبة الشحن (أسفل المنتصف) */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full border-4 border-emerald-400 flex items-center justify-center bg-white shadow-sm mb-1 border-t-transparent">
              <span className="text-sm font-black text-slate-800">{batteryLevel}%</span>
            </div>
            <span className="text-[9px] text-slate-400 font-black tracking-wider">BATTERY STATUS</span>
            <span className="text-base font-black text-emerald-600">kW {(batteryPower / 1000).toFixed(2)}</span>
            <span className="text-[9px] text-emerald-500 font-medium">تشحن</span>
          </div>

        </div>

      </div>

      {/* العدادات التقديرية الحسابية السفلية الرمادية الفاتحة */}
      <div className="grid grid-cols-3 gap-2 bg-white border border-slate-100 rounded-2xl p-3 mb-4 text-center shadow-sm text-[9px] font-bold text-slate-400">
        <div>
          <span className="block mb-1 text-slate-400">...DAY'S PRODUCTION</span>
          <span className="text-xs font-black text-slate-400">—</span>
        </div>
        <div className="border-x border-slate-100">
          <span className="block mb-1 text-slate-400">HOME USAGE</span>
          <span className="text-xs font-black text-slate-400">—</span>
        </div>
        <div>
          <span className="block mb-1 text-slate-400">GRID SAVINGS</span>
          <span className="text-xs font-black text-slate-400">—</span>
        </div>
      </div>

      {/* صندوق صمود البطارية التنبؤي ليلاً الذكي */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-amber-600 text-xs mb-2">🌙 صمود البطارية الجاري</h3>
        <div className="bg-emerald-50 p-3 rounded-xl text-xs font-bold text-emerald-800">
          ✓ تكفي حتى الصباح • صباحاً نحو {estimatedSocAtSunrise}%
          <p className="text-[10px] font-normal text-slate-500 mt-1">متبقي في مخزون البطارية حوالي {hoursRemaining} ساعة قبل حد الأمان</p>
        </div>
      </div>

      {/* شريط القائمة السفلي الموحد بنمط الـ Light Mode الفاخر للتنقل السريع */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-3 text-[10px] text-slate-400 z-50 rounded-t-2xl shadow-md">
        <div className="text-amber-500 font-bold">📊 الرئيسية</div>
        <div className="opacity-60">🏠 المنزل</div>
        <div className="opacity-60">🔋 البطارية</div>
        <div className="opacity-60">☀️ الطاقة</div>
        <div className="opacity-60">💰 المال</div>
      </div>

    </div>
  );
}
