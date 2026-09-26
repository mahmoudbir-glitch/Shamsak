"use client";

import React, { useState } from 'react';

export default function SolarDashboard() {
  // القراءات الحية المتوافقة تماماً مع قيم المخطط الدائري
  const [solarProduction] = useState<number>(5830); // 5.83 kW
  const [homeConsumption] = useState<number>(1300); // 1.30 kW
  const [batteryLevel] = useState<number>(78);         // 78%
  const [batteryPower] = useState<number>(4980);    // 4.98 kW
  const [gridPower] = useState<number>(450);        // 0.45 kW

  // حسابات الأمان والصمود التنبؤية الذكية للبطارية
  const SAFETY_RESERVE = 10;
  const usableSoc = Math.max(0, batteryLevel - SAFETY_RESERVE);
  const availableWh = 4800 * (usableSoc / 100);
  
  // الاستهلاك الحالي بالواط
  const currentConsumption = homeConsumption > 0 ? homeConsumption : 150;
  const hoursRemaining = Math.round((availableWh / currentConsumption) * 10) / 10;
  
  // ليلة غد وما تبقى من اليوم
  const estimatedSocAtSunrise = Math.max(SAFETY_RESERVE, Math.round(((4800 * (batteryLevel / 100) - (currentConsumption * 10)) / 4800) * 100));

  // شرط فحص الصمود ليلاً (إذا كانت الساعات المتبقية أقل من 8 ساعات تصبح البطارية غير كافية)
  const isBatteryEnough = hoursRemaining >= 8;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 pb-24 text-right relative overflow-x-hidden" dir="rtl">
      
      {/* ستايل حركة تدفق الطاقة داخل خطوط الأقواس الدائرية المنقطة */}
      <style>{`
        @keyframes strokeAnimation {
          to { stroke-dashoffset: -20; }
        }
        .flow-arc-active {
          stroke-dasharray: 6, 4;
          animation: strokeAnimation 1.5s linear infinite;
        }
      `}</style>

      {/* الهيدر العلوي النظيف - تم إلغاء النصوص المكررة والتداخل بصرى */}
      <div className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm mb-4 relative z-20">
        <h1 className="text-base font-black text-amber-500">شمسك ☀️</h1>
        <button 
          onClick={() => window.location.href = '/settings'}
          className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-xl font-bold border border-slate-200"
        >
          الإعدادات
        </button>
      </div>

      {/* المخطط الدائري الرئيسي */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-4 relative min-h-[440px] flex flex-col justify-between">
        
        <div className="flex justify-between items-center relative z-20">
          <span className="text-[10px] bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-black">DEMO</span>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">● حالة النظام الآن</span>
        </div>

        {/* شبكة الأقواس والمسارات الدائرية المنقطة والمتحركة */}
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center p-4">
          <svg className="w-full h-full max-h-[380px]" viewBox="0 0 400 380" fill="none" xmlns="http://w3.org">
            <path d="M 230 90 A 110 110 0 0 1 310 190" stroke="#ea580c" strokeWidth="2.5" className="flow-arc-active" />
            <path d="M 310 230 A 110 110 0 0 1 230 310" stroke="#059669" strokeWidth="2" className="flow-arc-active" />
            <path d="M 170 310 A 110 110 0 0 1 90 230" stroke="#7c3aed" strokeWidth="2.5" className="flow-arc-active" style={{ animationDirection: 'reverse' }} />
            <path d="M 90 190 A 110 110 0 0 1 170 90" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* كروت وعقد قراءة البيانات */}
        <div className="relative z-10 h-full flex flex-col justify-between space-y-4 my-auto">
          
          {/* عقدة الشمس */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-amber-200 bg-amber-50 flex items-center justify-center mb-1 shadow-sm">
              <span className="text-amber-500 text-xl">☀️</span>
            </div>
            <span className="text-[10px] text-slate-400 font-black tracking-wider">SOLAR</span>
            <span className="text-base font-black text-amber-600">kW {(solarProduction / 1000).toFixed(2)}</span>
            <span className="text-[9px] text-slate-400 font-medium">إنتاج حالي</span>
          </div>

          {/* الصف الأوسط */}
          <div className="flex justify-between items-center px-2">
            
            {/* عقدة الشبكة */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl border border-purple-100 bg-purple-50 flex items-center justify-center mb-1 shadow-sm">
                <span className="text-purple-500 text-lg">🛜</span>
              </div>
              <span className="text-[9px] text-slate-400 font-black tracking-wider">GRID STATUS</span>
              <span className="text-sm font-black text-purple-600">kW {(gridPower / 1000).toFixed(2)}</span>
              <span className="text-[8px] text-purple-400 font-medium">تصدير إلى الشبكة</span>
            </div>

            <div className="w-10 h-10 rounded-full border border-slate-100 bg-white flex items-center justify-center text-amber-500 shadow-md font-bold text-sm">
              ⚡
            </div>

            {/* عقدة استهلاك المنزل */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl border border-blue-100 bg-blue-50 flex items-center justify-center mb-1 shadow-sm">
                <span className="text-blue-500 text-lg">🏠</span>
              </div>
              <span className="text-[9px] text-slate-400 font-black tracking-wider">HOME CONSUMPTION</span>
              <span className="text-sm font-black text-blue-600">kW {(homeConsumption / 1000).toFixed(2)}</span>
              <span className="text-[8px] text-slate-400 font-medium">استهلاك حالي</span>
            </div>

          </div>

          {/* عقدة البطارية */}
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

      {/* 3. العدادات التقديرية الحسابية السفلية الممتلئة بالبيانات الجمالية بدلاً من الخطوط الفارغة */}
      <div className="grid grid-cols-3 gap-2 bg-white border border-slate-100 rounded-2xl p-3 mb-4 text-center shadow-sm text-[9px] font-bold text-slate-400">
        <div>
          <span className="block mb-1 text-slate-400">DAY'S PRODUCTION</span>
          <span className="text-xs font-black text-amber-600">31.4 kWh</span>
        </div>
        <div className="border-x border-slate-100">
          <span className="block mb-1 text-slate-400">HOME USAGE</span>
          <span className="text-xs font-black text-blue-600">18.2 kWh</span>
        </div>
        <div>
          <span className="block mb-1 text-slate-400">GRID SAVINGS</span>
          <span className="text-xs font-black text-emerald-600">\$4.15</span>
        </div>
      </div>

      {/* 4. صندوق صمود البطارية الجاري الذكي (يتحول لونه تلقائياً بناءً على الحسابات المنطقية) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-slate-700 text-xs mb-2">🌙 صمود البطارية الجاري ليلاً</h3>
        
        {isBatteryEnough ? (
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs font-bold text-emerald-800">
            ✓ تكفي حتى الصباح • صباحاً نحو {estimatedSocAtSunrise}%
            <p className="text-[10px] font-normal text-slate-500 mt-1">متبقي في مخزون البطارية حوالي {hoursRemaining} ساعة</p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs font-bold text-amber-800">
            ⚠️ قد لا تكفي حتى الصباح بناءً على الاستهلاك الحالي
            <p className="text-[10px] font-normal text-slate-500 mt-1">متبقي في مخزون البطارية حوالي {hoursRemaining} ساعة فقط قبل حد الأمان</p>
          </div>
        )}
      </div>

      {/* شريط القائمة السفلي الموحد الفاتح */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-3 text-[10px] text-slate-400 z-50 rounded-t-2xl shadow-md">
        <div className="text-amber-500 font-bold" onClick={() => window.location.href = '/'}>📊 الرئيسية</div>
        <div className="opacity-60" onClick={() => window.location.href = '/home'}>🏠 المنزل</div>
        <div className="opacity-60" onClick={() => window.location.href = '/battery'}>🔋 البطارية</div>
        <div className="opacity-60" onClick={() => window.location.href = '/energy'}>☀️ الطاقة</div>
        <div className="opacity-60" onClick={() => window.location.href = '/money'}>💰 المال</div>
      </div>

    </div>
  );
}
