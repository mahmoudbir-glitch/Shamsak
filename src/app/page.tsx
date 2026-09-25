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

      {/* المخطط التدفقي الرئيسي */}
      <div className="bg-slate-800 bg-opacity-40 border border-slate-700 rounded-3xl p-4 shadow-xl mb-6 relative text-center">
        
        {/* عقدة الشمس */}
        <div className="flex justify-center my-4">
          <div className="bg-slate-900 border-2 border-amber-500 border-b-4 p-3 rounded-2xl w-36 shadow-lg">
            <span className="text-amber-400 text-xl block">☀️</span>
            <span className="text-[10px] text-slate-400 block font-bold">SOLAR (الشمس)</span>
            <span className="text-lg font-black text-amber-400 mt-0.5 block">{(solarProduction / 1000).toFixed(1)} kW</span>
          </div>
        </div>

        {/* العقد الوسطى */}
        <div className="flex justify-between items-center px-2 my-6">
          <div className="bg-slate-900 border-2 border-purple-500 border-l-4 p-3 rounded-2xl w-28 shadow-lg">
            <span className="text-purple-400 text-lg block">🛜</span>
            <span className="text-[9px] text-slate-400 block font-bold">GRID STATUS</span>
            <span className="text-sm font-black text-purple-400 mt-0.5 block">{(gridImport / 1000).toFixed(1)} kW</span>
          </div>

          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shadow-md text-sm font-bold animate-pulse">⚡</div>

          <div className="bg-slate-900 border-2 border-blue-500 border-r-4 p-3 rounded-2xl w-28 shadow-lg">
            <span className="text-blue-400 text-lg block">🏠</span>
            <span className="text-[9px] text-slate-400 block font-bold">HOME</span>
            <span className="text-sm font-black text-blue-400 mt-0.5 block">{(homeConsumption / 1000).toFixed(1)} kW</span>
          </div>
        </div>

        {/* عقدة البطارية */}
        <div className="flex justify-center my-4">
          <div className="bg-slate-900 border-2 border-emerald-500 border-t-4 p-3 rounded-2xl w-44 shadow-lg">
            <span className="text-emerald-400 text-base mr-1">🔋</span>
            <span className="text-[10px] text-slate-400 font-bold">BATTERY STATUS</span>
            <div className="flex justify-center items-baseline gap-2 mt-1">
              <span className="text-base font-black text-emerald-400">{batteryLevel}%</span>
              <span className="text-xs font-bold text-slate-400">| 8.9 kW</span>
            </div>
          </div>
        </div>

      </div>

      {/* صندوق صمود البطارية */}
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

      {/* صندوق استغلال الفائض الشمسي */}
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

      {/* شريط القائمة السفلي للتنقل */}
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
        </div>
        <div className="flex flex-col items-center gap-0.5 opacity-60">
          <span className="text-lg">💰</span>المال
        </div>
      </div>

    </div>
  );
}
