"use client";

import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  // 1. إعداد قيم التحكم الافتراضية للمنظومة
  const [panelCapacity, setPanelCapacity] = useState<number>(6); 
  const [batteryCapacity, setBatteryCapacity] = useState<number>(4800); 
  const [currency, setCurrency] = useState<string>("ل.س"); 
  const [notifySurplus, setNotifySurplus] = useState<boolean>(true); 
  const [notifyLowBattery, setNotifyLowBattery] = useState<boolean>(true); 

  // 2. خطوة قراءة القيم المحفوظة في ذاكرة المتصفح فور فتح الصفحة (Client-side load)
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

  // 3. دالة الحفظ داخل الـ LocalStorage وتأكيد العملية
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
      
      {/* هيدر صفحة الإعدادات */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
          ⚙️ إعدادات منظومة شمسك
        </h1>
        <div className="text-xs text-slate-400">التهيئة والذاكرة</div>
      </div>

      {/* القسم 1: إعدادات العتاد */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 border-b border-slate-50 pb-2">📊 مواصفات العتاد (Hardware)</h3>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">إجمالي قدرة الألواح الموصولة</span>
          <div className="flex items-center gap-1.5">
            <input 
              type="number" 
              value={panelCapacity} 
              onChange={(e) => setPanelCapacity(Number(e.target.value))}
              className="w-16 bg-slate-50 border border-slate-200 text-center rounded-lg p-1 font-bold text-slate-800"
            />
            <span className="text-slate-400">kW</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">سعة خزان البطاريات الإجمالية</span>
          <div className="flex items-center gap-1.5">
            <input 
              type="number" 
              value={batteryCapacity} 
              onChange={(e) => setBatteryCapacity(Number(e.target.value))}
              className="w-20 bg-slate-50 border border-slate-200 text-center rounded-lg p-1 font-bold text-slate-800"
            />
            <span className="text-slate-400">Wh</span>
          </div>
        </div>
      </div>

      {/* القسم 2: الإعدادات المالية */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 border-b border-slate-50 pb-2">💰 التفضيلات المالية</h3>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">العملة المحلية لحساب التوفير</span>
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-center rounded-lg p-1 font-bold text-slate-800"
          >
            <option value="ل.س">ليرة سورية (ل.س)</option>
            <option value="USD">دولار أمريكي ($)</option>
            <option value="LBP">ليرة لبنانية (L.B.P)</option>
          </select>
        </div>
      </div>

      {/* القسم 3: الإشعارات */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 border-b border-slate-50 pb-2">🔔 التنبيهات المنبثقة</h3>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">تنبيهي عند وجود فائض طاقة غير مستغل</span>
          <input 
            type="checkbox" 
            checked={notifySurplus} 
            onChange={(e) => setNotifySurplus(e.target.checked)}
            className="w-4 h-4 accent-amber-500"
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium">تنبيهي عند اقتراب البطارية من حد الأمان (10%)</span>
          <input 
            type="checkbox" 
            checked={notifyLowBattery} 
            onChange={(e) => setNotifyLowBattery(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
        </div>
      </div>

      {/* زر الحفظ والتثبيت الفعلي في الذاكرة */}
      <button 
        onClick={handleSaveSettings}
        className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl text-xs shadow-md active:bg-slate-800 transition-colors"
      >
        حفظ وتثبيت الإعدادات في ذاكرة الهاتف
      </button>

      {/* شريط القائمة السفلي الموحد */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-3 text-[10px] text-slate-400 z-50 rounded-t-2xl shadow-md">
        <button onClick={() => window.location.href = '/'} className="text-amber-500 font-bold flex flex-col items-center">📊 الرئيسية</button>
        <div className="opacity-60 flex flex-col items-center">🏠 المنزل</div>
        <div className="opacity-60 flex flex-col items-center">🔋 البطارية</div>
        <div className="opacity-60 flex flex-col items-center">☀️ الطاقة</div>
        <div className="opacity-60 flex flex-col items-center">💰 المال</div>
      </div>

    </div>
  );
}
