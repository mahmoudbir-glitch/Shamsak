"use client";

import React, { useState } from 'react';

export default function BatteryPage() {
  const [soc, setSoc] = useState<number>(94); 
  const [batteryStatus, setBatteryStatus] = useState<string>("تشحن"); 
  const [chargePower, setChargePower] = useState<number>(4300); 
  const [voltage, setVoltage] = useState<number>(54.3); 

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">🔋 حالة البطارية</h1>
        <div className="text-xs text-slate-400">بيانات تجريبية نشطة</div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 text-center">
        <span className="text-xs font-bold text-slate-400 block mb-1">نسبة الشحن الحالية (SOC)</span>
        <span className="text-5xl font-black text-emerald-600 block mb-4">{soc}%</span>
        <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden mb-2">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${soc}%` }}></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 text-sm">
          <span className="text-slate-500">حالة التشغيل</span>
          <span className="font-bold text-slate-800">{batteryStatus} • {chargePower.toLocaleString()} واط</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">جهد البطارية</span>
          <span className="font-bold text-slate-800">{voltage} فولت</span>
        </div>
      </div>
    </div>
  );
}
