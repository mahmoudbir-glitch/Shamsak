"use client";

import React, { useState } from 'react';

interface BatteryData {
  capacityWh: number;
  currentSoc: number;
  consumptionW: number;
}

interface WeatherData {
  condition: 'sunny' | 'cloudy' | 'rainy';
  expectedSunHours: number;
}

function calculateBatteryAutonomy(battery: BatteryData, weather: WeatherData) {
  const SAFETY_RESERVE_PCT = 10;
  const usableSoc = Math.max(0, battery.currentSoc - SAFETY_RESERVE_PCT);
  const availableEnergyWh = battery.capacityWh * (usableSoc / 100);
  const currentConsumption = battery.consumptionW > 0 ? battery.consumptionW : 150; 
  const hoursRemaining = availableEnergyWh / currentConsumption;

  const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;
  const willLastUntilMorning = hoursRemaining >= 10;

  let weatherFactor = 1.0;
  if (weather.condition === 'cloudy') weatherFactor = 0.5;
  if (weather.condition === 'rainy') weatherFactor = 0.15;

  const expectedProductionWh = weather.expectedSunHours * weatherFactor * 5000;
  const surplusWh = Math.max(0, expectedProductionWh - (currentConsumption * 8));

  const totalNightConsumptionWh = currentConsumption * 10;
  const currentTotalEnergyWh = battery.capacityWh * (battery.currentSoc / 100);
  const estimatedSocAtSunrise = Math.max(
    SAFETY_RESERVE_PCT, 
    Math.round(((currentTotalEnergyWh - totalNightConsumptionWh) / battery.capacityWh) * 100)
  );

  return {
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    willLastUntilMorning: isNight ? willLastUntilMorning : true,
    estimatedSocAtSunrise: isNight ? estimatedSocAtSunrise : battery.currentSoc,
    expectedSurplusWh: Math.round(surplusWh),
    confidenceScore: weather.condition === 'sunny' ? 95 : 75
  };
}

export default function SolarDashboard() {
  const [solarProduction] = useState<number>(6800); 
  const [homeConsumption] = useState<number>(3200); 
  const [batteryLevel] = useState<number>(94);         
  const [gridImport] = useState<number>(500);            

  const prediction = calculateBatteryAutonomy(
    { capacityWh: 4800, currentSoc: batteryLevel, consumptionW: homeConsumption },
    { condition: 'sunny', expectedSunHours: 5.5 }
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-24 text-right relative overflow-x-hidden" dir="rtl">
      
      {/* الهيدر العلوي */}
      <div className="flex justify-between items-center bg-slate-800 bg-opacity-60 p-4 rounded-2xl shadow-lg mb-6 border border-slate-700">
        <h1 className="text-xl font-black text-amber-400">
          شمسك <span className="text-[10px] bg-amber-500 bg-opacity-20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">نظام حي تفاعلي</span>
        </h1>
        <div className="text-xs text-slate-400 font-medium">مخطط التدفق اللحظي</div>
      </div>

      {/* المخطط التدفقي الرئيسي الخلفي */}
      <div className="bg-slate-800 bg-opacity-40 border border-slate-700 rounded-3xl p-4 shadow-xl mb-6 relative min-h-[460px] flex flex-col justify-between">
        
        {/* رسمة شبكة التدفق الديناميكية */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80">
          <svg className="w-full h-full" viewBox="0 0 400 460" fill="none" xmlns="http://w3.org">
            <path d="M 200 65 L 200 400" stroke="#475569" strokeWidth="2" />
            <path d="M 75 220 L 325 220" stroke="#475569" strokeWidth="2" />
            <path d="M 200 65 L 200 220" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6 4" />
            <path d="M 200 220 L 325 220" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6 4" />
            <path d="M 75 220 L 200 220" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="6 4" />
            <path d="M 200 220 L 200 400" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 4" />
            <path d="M 75 200 A 110 110 0 0 1 180 65" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M 220 65 A 110 110 0 0 1 325 200" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" />
            <path d="M 75 240 A 110 110 0 0 0 180 390" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M 220 390 A 110 110 0 0 0 325 240" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* الكروت وعقد البيانات الحية المعروضة بشكل منظم */}
        <div className="relative z-10 h-full flex flex-col justify-between space-y-12">
          
          <div className="flex justify-center">
            <div className="bg-slate-900 bg-opacity-90 border-2 border-amber-500 border-b-4 p-3 rounded-2xl w-36 shadow-lg text-center">
              <span className="text-amber-400 text-xl block">☀️</span>
              <span className="text-[10px] text-slate-400 block font-bold">SOLAR (الشمس)</span>
              <span className="text-lg font-black text-amber-400 mt-0.5 block">{(solarProduction / 1000).toFixed(1)} kW</span>
            </div>
          </div>

          <div className="flex justify-between items-center px-2">
            <div className="bg-slate-900 bg-opacity-90 border-2 border-purple-500 border-l-4 p-3 rounded-2xl w-28 shadow-lg text-center">
              <span className="text-purple-400 text-lg block">🛜</span>
              <span className="text-[9px] text-slate-400 block font-bold">GRID STATUS</span>
              <span className="text-sm font-black text-purple-400 mt-0.5 block">{(gridImport / 1000).toFixed(1)} kW</span>
              <span className="text-[8px] text-slate-400 font-medium block mt-0.5">(Importing)</span>
            </div>

            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shadow-md text-sm font-bold z-10 animate-pulse">⚡</div>
            </div>

            <div className="bg-slate-900 bg-opacity-90 border-2 border-blue-500 border-r-4 p-3 rounded-2xl w-28 shadow-lg text-center">
              <span className="text-blue-400 text-lg block">🏠</span>
              <span className="text-[9px] text-slate-400 block font-bold">HOME CONSUMPTION</span>
              <span className="text-sm font-black text-blue-400 mt-0.5 block">{(homeConsumption / 1000).toFixed(1)} kW</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="bg-slate-900 bg-opacity-90 border-2 border-emerald-500 border-t-4 p-3 rounded-2xl w-44 shadow-lg text-center">
              <div className="flex justify-center items-center gap-1.5 mb-0.5">
                <span className="text-emerald-400 text-base">🔋</span>
                <span className="text-[10px] text-slate-400 font-bold block">BATTERY STATUS</span>
              </div>
              <div className="flex justify-center items-baseline gap-2 mt-1">
                <span className="text-base font-black text-emerald-400">{batteryLevel}%</span>
                <span className="text-xs font-bold text-slate-400">| 8.9 kW</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* صندوق التنبؤ بالصمود */}
      <div className="bg-slate-800 bg-opacity-60 border border-slate-700 rounded-2xl p-4 mb-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-amber-400 text-xs flex items-center gap-1">🌙 صمود البطارية ليلاً</h3>
          <span className="text-[10px] text-slate-500">حتى الشروق 06:15</span>
        </div>
        <div className="bg-slate-900 bg-opacity-80 border border-slate-800 rounded-xl p-3 shadow-inner mb-2">
          <div className="flex items-start gap-2 text-emerald-400 font-bold text-xs">
            <span className="text-sm">✓</span>
            <div>
              <p>تكفي حتى الصباح • صباحاً نحو {prediction.estimatedSocAtSunrise}%</p>
              <p className="text-[10px] font-normal text-slate-400 mt-1">متبقي في مخزون البطارية حوالي {prediction.hoursRemaining} ساعة قبل حد الأمان</p>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 text-left">احتمال صمود المنظومة وفق الطقس نحو {prediction.confidenceScore}%</p>
      </div>

      {/* صندوق التوجيه والاستغلال الفائض */}
      <div className="bg-slate-800 bg-opacity-60 border border-slate-700 rounded-2xl p-4 mb-6 shadow-lg">
        <div className="flex items-center gap-1 text-blue-400 font-bold text-xs mb-2">
          <span>⚡</span>
          <h3>توجيه استغلال الفائض الشمسي القادم</h3>
        </div>
        <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
          يتوقع وجود طاقة إنتاجية نظيفة فائضة بنحو <span className="font-bold text-amber-400 text-xs">{prediction.expectedSurplusWh} واط ساعي</span>.
        </p>
        <div className="bg-slate-900 bg-opacity-90 rounded-xl p-3 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
          💡 **نصيحة شمسك:** يوصى بجدولة وتشغيل أجهزتك ذات الأحمال الكبيرة كـ **(الغسالة أو مضخة المياه)** بين الساعة <span className="font-bold text-amber-400">12:30 و 17:00</span> للاستفادة الكاملة والمجانية.
        </div>
      </div>

      {/* شريط التنقل السفلي */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 bg-opacity-95 border-t border-slate-800 flex justify-around py-3 text-[10px] text-slate-400 shadow-2xl z-50 rounded-t-2xl">
        <div className="text-amber-400 font-bold flex flex-col items-center gap-0.5">
          <span className="text-lg">📊</span>الرئيسية
        </div>
        <div className="flex flex-col items-center gap-0.5 opacity-60">
          <span className="text-lg">🏠</span>المنزل
        </div>
        <div className="flex flex-col items-center gap-0.5 opacity-60">
          <span className="text-lg">🔋</span>البطارية
        </div>
        <div className="flex flex-col items-center gap-0.5 opacity-60">
          <span className="text-lg">☀️</span>الطاقة
