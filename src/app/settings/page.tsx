"use client";

import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [panelCapacity, setPanelCapacity] = useState<number>(6); 
  const [batteryCapacity, setBatteryCapacity] = useState<number>(4800); 
  const [currency, setCurrency] = useState<string>("ل.س"); 
  const [notifySurplus, setNotifySurplus] = useState<boolean>(true); 
  const [notifyLowBattery, setNotifyLowBattery] = useState<boolean>(true); 

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPanels = localStorage.getItem("shamsak_panel_capacity");
      const savedBattery = localStorage.getItem("shamsak_battery_capacity");
      const savedCurrency = localStorage.getItem("shamsak_currency");
      
      if (savedPanels) setPanelCapacity(Number(savedPanels));
      if (savedBattery) setBatteryCapacity(Number(savedBattery));
      if (savedCurrency) setCurrency(savedCurrency);
    }
  }, []);

  const handleSaveSettings = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("shamsak_panel_capacity", panelCapacity.toString());
      localStorage.setItem("shamsak_battery_capacity", batteryCapacity.toString());
      localStorage.setItem("shamsak_currency", currency);
      
      alert("تم حفظ المواصفات وتثبيتها في ذاكرة هاتف المستخدم بنجاح! ✅");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
          ⚙️ إعدادات منظومة شمسك
        </h1>
        <div className="text-xs text-slate-400">التهيئة والذاكرة</div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 border-b border-slate-50 pb-2">📊 مواصفات العتاد (Hardware)</h3>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">إجمالي قدرة الألواح الموصولة</span>
          <div className="flex items-center gap-1.5">
            <input type="number" value={panelCapacity} onChange={(e) => setPanelCapacity(Number(e.target.value))} className="w-16 bg-slate-50 border border-slate-200 text-center rounded-lg p-1 font-bold text-slate-800" />
            <span className="text-slate-400">kW</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">سعة خزان البطاريات الإجمالية</span>
          <div className="flex items-center gap-1.5">
            <input type="number" value={batteryCapacity} onChange={(e) => setBatteryCapacity(Number(e.target.value))} className="w-20 bg-slate-50 border border-slate-200 text-center rounded-lg p-1 font-bold text-slate-800" />
            <span className="text-slate-400">Wh</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 border-b border-slate-50 pb-2">💰 التفضيلات المالية</h3>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">العملة المحلية لحساب التوفير</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-slate-50 border border-slate-200 text-center rounded-lg p-1 font-bold text-slate-800">
            <option value="ل.س">ليرة سورية (ل.س)</option>
            <option value="USD">دولار أمريكي ($)</option>
            <option value="LBP">ليرة لبنانية (L.B.P)</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 border-b border-slate-50 pb-2">🔔 التنبيهات المنبثقة</h3>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">تنبيهي عند وجود فائض طاقة غير مستغل</span>
          <input type="checkbox" checked={notifySurplus} onChange={(e) => setNotifySurplus(e.target.checked)} className="w-4 h-4 accent-amber-500" />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">تنبيهي عند اقتراب البطارية من حد الأمان (10%)</span>
          <input type="checkbox" checked={notifyLowBattery} onChange={(e) => setNotifyLowBattery(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
        </div>
      </div>

      <button 
        onClick={handleSaveSettings}
        className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs shadow-md active:bg-slate-800 transition-colors"
      >
        حفظ وتثبيت الإعدادات في ذاكرة الهاتف
      </button>
    </div>
  );
}
