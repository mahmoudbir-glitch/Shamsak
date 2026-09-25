"use client";

import React, { useState } from 'react';
// 1. استيراد دالة الحساب الذكية التي أنشأناها في المجلد utils
import { calculateBatteryAutonomy } from '@/utils/solarPredictions';

export default function SolarDashboard() {
  // 2. إعداد قيم الطاقة اللحظية (مطابقة لقراءات الصور)
  const [solarProduction, setSolarProduction] = useState<number>(5827); // إنتاج الشمس بالواط
  const [homeConsumption, setHomeConsumption] = useState<number>(1299); // استهلاك المنزل بالواط
  const [batteryLevel, setBatteryLevel] = useState<number>(94);         // نسبة شحن البطارية %
  const [gridStatus, setGridStatus] = useState<string>("مقطوعة");       // حالة شبكة الكهرباء

  // 3. إعداد بيانات الطقس التجريبية المتوقعة
  const weatherCondition: 'sunny' | 'cloudy' | 'rainy' = 'sunny';
  const expectedSunHours = 5.5;

  // 4. استدعاء الدالة الذكية وتمرير البيانات لها للحصول على التوقعات الحية
  const prediction = calculateBatteryAutonomy(
    {
      capacityWh: 4800,        // سعة المنظومة الافتراضية بالواط ساعي
      currentSoc: batteryLevel,
      consumptionW: homeConsumption
    },
    {
      condition: weatherCondition,
      expectedSunHours: expectedSunHours
    }
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      
      {/* الهيدر العلوي */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-amber-500 flex items-center gap-1">
          شمسك <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-normal">الرئيسية</span>
        </h1>
        <div className="text-xs text-slate-400">حالة الطاقة الآن</div>
      </div>

      {/* القسم 1: مخطط التدفق اللحظي المتفاعل */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 relative">
        <div className="grid grid-cols-3 gap-2 items-center text-center relative z-10">
          
          {/* العنصر العلوي: الشمس */}
          <div className="col-span-3 flex justify-center mb-2">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl w-32 shadow-sm">
              <span className="text-amber-500 text-lg block">☀️</span>
              <span className="text-xs text-slate-500 block">الشمس</span>
              <span className="text-base font-black text-amber-600">{solarProduction.toLocaleString()} واط</span>
            </div>
          </div>

          {/* العنصر الأيسر: الشبكة */}
          <div className="flex justify-start">
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl w-28 shadow-sm">
              <span className="text-purple-500 text-lg block">🛜</span>
              <span className="text-xs text-slate-500 block">الشبكة</span>
              <span className="text-sm font-bold text-purple-600">{gridStatus}</span>
            </div>
          </div>

          {/* نقطة التقاطع والربط الوهمية في المنتصف */}
          <div className="flex justify-center">
            <div className="w-4 h-4 rounded-full bg-slate-200 border-2 border-white animate-pulse"></div>
          </div>

          {/* العنصر الأيمن: المنزل */}
          <div className="flex justify-end">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl w-28 shadow-sm">
              <span className="text-blue-500 text-lg block">🏠</span>
              <span className="text-xs text-slate-500 block">المنزل</span>
              <span className="text-sm font-black text-blue-600">{homeConsumption.toLocaleString()} واط</span>
            </div>
          </div>

          {/* العنصر السفلي: البطارية */}
          <div className="col-span-3 flex justify-center mt-2">
            <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl w-40 shadow-sm">
              <span className="text-emerald-500 text-lg block">🔋</span>
              <span className="text-xs text-slate-500 block">البطارية</span>
              <span className="text-xl font-black text-emerald-600">{batteryLevel}%</span>
              <span className="text-xs text-slate-400 block mt-0.5">تشحن بـ 4,300 واط</span>
            </div>
          </div>

        </div>
      </div>

      {/* القسم 2: صندوق التنبؤ الذكي بصمود البطارية (الليلة الجارية) */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1">🌙 ليلة غد وما تبقى من اليوم</h3>
          <span className="text-xs text-slate-400">حتى الشروق 06:15</span>
        </div>
        <div className="bg-white border border-amber-100 rounded-xl p-3 shadow-inner mb-2">
          <div className="flex items-start gap-2 text-emerald-700 font-bold text-sm">
            <span className="text-base">✓</span>
            <div>
              <p>تكفي حتى الصباح • صباحاً نحو {prediction.estimatedSocAtSunrise}%</p>
              <p className="text-xs font-normal text-slate-500 mt-0.5">متبقي في مخزون البطارية حوالي {prediction.hoursRemaining} ساعة</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-amber-700 text-left">احتمال الصمود وفق التوقع نحو {prediction.confidenceScore}%</p>
      </div>

      {/* القسم 3: صندوق استغلال فائض الطاقة الشمسي */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-1 text-blue-900 font-bold text-sm mb-2">
          <span>⚡</span>
          <h3>توجيه استغلال فائض الطاقة</h3>
        </div>
        <p className="text-xs text-blue-800 mb-3 leading-relaxed">
          يتوقع وجود فائض طاقة إنتاجية نظيفة بنحو <span className="font-bold text-amber-600 text-sm">{prediction.expectedSurplusWh} واط ساعي</span>.
        </p>
        <div className="bg-white bg-opacity-70 rounded-xl p-3 border border-blue-100 text-xs text-blue-950 leading-loose">
          💡 **توصية ذكية من شمسك:** ننصح بجدولة وتوصيل الأحمال الثقيلة مثل **(الغسالة، السخان، أو مضخة المياه)** ما بين الساعة <span className="font-bold text-blue-700">12:30 و 17:00</span> للاستفادة المجانية القصوى.
        </div>
      </div>

      {/* شريط القائمة السفلي للتنقل السريع */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 text-[10px] text-slate-400 shadow-lg z-50 rounded-t-2xl">
        <div className="text-amber-500 font-bold flex flex-col items-center gap-0.5">
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
          <span className="text-lg">💰</span>الالمال
        </div>
      </div>

    </div>
  );
}
