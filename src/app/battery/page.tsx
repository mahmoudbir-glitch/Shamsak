"use client";

import React, { useState } from 'react';

export default function BatteryPage() {
  // قيم افتراضية ومؤشرات فنية مطابقة لقراءات المنظومة الذكية
  const [soc, setSoc] = useState<number>(94);                         // نسبة الشحن الحالية %
  const [batteryStatus, setBatteryStatus] = useState<string>("تشحن");   // حالة البطارية الآن
  const [chargePower, setChargePower] = useState<number>(4290);        // قوة الشحن اللحظية بالواط
  const [voltage, setVoltage] = useState<number>(54.3);                // جهد البطارية الكلي بالفولت
  const [temperature, setTemperature] = useState<number>(28);          // درجة حرارة خلايا البطارية

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      
      {/* الهيدر العلوي لتبويب البطارية */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
          🔋 تفاصيل خلايا البطارية
        </h1>
        <div className="text-xs text-slate-400">تحديث فوري</div>
      </div>

      {/* بطاقة النسبة المئوية الكبيرة والمؤشر الحركي */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 text-center">
        <span className="text-xs font-bold text-slate-400 block mb-1">حالة الشحن الحالية (SOC)</span>
        <span className="text-5xl font-black text-emerald-600 block mb-4">{soc}%</span>
        
        {/* شريط التقدم الأخضر */}
        <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden mb-2 shadow-inner">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${soc}%` }}></div>
        </div>
      </div>

      {/* تفاصيل القراءات الفنية المستخرجة من الإنفرتر */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 space-y-4">
        
        {/* الحالة وقوة الشحن */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <span>⚡</span>
            <span>حالة التشغيل</span>
          </div>
          <span className="font-bold text-slate-800">{batteryStatus} • {chargePower.toLocaleString()} واط</span>
        </div>

        {/* جهد البطارية الإجمالي */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <span>🔌</span>
            <span>جهد البطارية (Voltage)</span>
          </div>
          <span className="font-bold text-slate-800">{voltage} فولت</span>
        </div>

        {/* درجة الحرارة الحالية */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <span>🌡️</span>
            <span>درجة حرارة الخلايا</span>
          </div>
          <span className="font-bold text-slate-800">{temperature}° مئوية</span>
        </div>

      </div>

      {/* شريط القائمة السفلي الموحد لسهولة التنقل السريع بين التبويبات */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 text-[10px] text-slate-400 shadow-lg z-50 rounded-t-2xl">
        <div className="flex flex-col items-center gap-0.5 opacity-60">
          <span className="text-lg">📊</span>الرئيسية
        </div>
        <div className="flex flex-col items-center gap-0.5 opacity-60">
          <span className="text-lg">🏠</span>المنزل
        </div>
        <div className="text-amber-500 font-bold flex flex-col items-center gap-0.5">
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
