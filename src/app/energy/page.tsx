"use client";

import React, { useState, useEffect } from 'react';

export default function EnergyPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [weatherData, setWeatherData] = useState<any>(null);

  // إحداثيات مدينة بيروت لجلب الطقس الدقيق والحي لها
  const LATITUDE = 33.8938;
  const LONGITUDE = 35.5018;

  // قراءات المنظومة الحية الموحدة المتوافقة مع واجهتك الرئيسية
  const batteryLevel = 78;        // نسبة البطارية الموحدة 78%
  const batteryCapacityWh = 4800; // سعة البطارية الكلية بالواط ساعي
  const chargePowerW = 4980;      // قوة الشحن بالواط (4.98 kW)

  useEffect(() => {
    async function fetchLiveWeather() {
      try {
        const response = await fetch(
          `https://open-meteo.com{LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const data = await response.json();
        setWeatherData(data);
        setLoading(false);
      } catch (error) {
        console.error("فشل جلب بيانات الطقس الحية:", error);
        setLoading(false);
      }
    }
    fetchLiveWeather();
  }, []);

  // دالة تحويل أكواد الطقس العالمية إلى كلمات عربية مألوفة
  const interpretWeatherCode = (code: number) => {
    if (code === 0) return "مشمس صافي";
    if (code >= 1 && code <= 3) return "غائم جزئياً";
    if (code >= 51 && code <= 67) return "رذاذ خفيف";
    if (code >= 71 && code <= 86) return "احتمال ثلوج";
    return "أمطار وعواصف";
  };

  // 1. حساب وقت امتلاء البطارية ديناميكياً بدلاً من علامة "—" الفارغة
  const remainingPercent = 100 - batteryLevel; // النسبة المتبقية للامتلاء (22%)
  const neededEnergyWh = batteryCapacityWh * (remainingPercent / 100); // الطاقة المطلوبة بالواط ساعي
  const timeToFullHours = neededEnergyWh / chargePowerW; // الوقت بالساعات
  const timeToFullMinutes = Math.round(timeToFullHours * 60); // تحويل الوقت لدقائق

  const timeToFullString = timeToFullMinutes > 0 
    ? `خلال ${timeToFullMinutes} دقيقة` 
    : "ممتلئة الآن";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-bold" dir="rtl">
        جاري تحديث توقعات الطقس والتحليلات الحية لبيروت... ✨
      </div>
    );
  }

  const currentTemp = weatherData?.current?.temperature_2m || 25;
  const currentStatus = interpretWeatherCode(weatherData?.current?.weather_code || 0);

  // 2. مصفوفة بيانات جدول الساعات التقديري المفقود (توزيع الكيلوواط الساعي على مدار اليوم)
  const hourlyData = [
    { time: "٠٣:٠٠ ص", solar: "0.00 kWh", usage: "0.75 kWh" },
    { time: "٠٤:٠٠ ص", solar: "0.00 kWh", usage: "0.75 kWh" },
    { time: "٠٥:٠٠ ص", solar: "0.00 kWh", usage: "0.75 kWh" },
    { time: "٠٦:٠٠ ص", solar: "0.00 kWh", usage: "0.75 kWh" },
    { time: "٠٧:٠٠ ص", solar: "0.00 kWh", usage: "1.15 kWh" },
    { time: "٠٨:٠٠ ص", solar: "1.20 kWh", usage: "1.30 kWh" },
    { time: "٠٩:٠٠ ص", solar: "2.80 kWh", usage: "1.30 kWh" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      
      {/* هيدر التبويب */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-amber-600">☀️ الطاقة والتوقعات</h1>
        <div className="text-xs text-slate-400">Open-Meteo • حي</div>
      </div>

      {/* بطاقة الطقس الحالية المتصلة بالـ API */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-400 block mb-1">بيروت الآن</span>
          <span className="text-lg font-black text-slate-800">{currentStatus}</span>
        </div>
        <span className="text-3xl font-black text-amber-500">{Math.round(currentTemp)}°م</span>
      </div>

      {/* توقع التوليد الإجمالي والفائض */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 space-y-3">
        <h3 className="font-bold text-sm text-slate-700">📊 توقعات التوليد التقديرية</h3>
        <div className="flex justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
          <span className="text-slate-500">إنتاج متوقع إجمالي</span>
          <span className="font-black text-slate-800">31.9 kWh</span>
        </div>
        <div className="flex justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
          <span className="text-slate-500">موجّه إلى البطارية</span>
          <span className="font-black text-emerald-600">11.1 kWh</span>
        </div>
        <div className="flex justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
          <span className="text-slate-500">فائض متوقع غير مستغل</span>
          <span className="font-black text-amber-600">10.1 kWh</span>
        </div>
      </div>

      {/* بطاقات المؤشرات الزمنية مع حقن وقت الامتلاء المحسوب ديناميكياً */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 space-y-3 text-xs">
        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
          <span className="text-slate-500">🌅 الشروق</span>
          <span className="font-bold text-slate-700">٠٨:٤٨ ص</span>
        </div>
        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
          <span className="text-slate-500">🔋 امتلاء البطارية التقديري</span>
          <span className="font-bold text-emerald-600">{timeToFullString}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">🌇 الغروب</span>
          <span className="font-bold text-slate-700">٠٨:٥٤ م</span>
        </div>
      </div>

      {/* ميزة جدول تفصيل الساعات التقديري المفقود (مطابق لتطبيق شمس) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h3 className="font-bold text-sm text-slate-700 mb-3">📋 تفصيل الساعات المتوقع</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <th className="pb-2 text-right">الوقت</th>
                <th className="pb-2">الشمس</th>
                <th className="pb-2 text-left">الاستهلاك</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 font-medium">
              {hourlyData.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 text-right font-bold text-slate-500">{row.time}</td>
                  <td className="py-2.5 text-amber-600 font-bold">{row.solar}</td>
                  <td className="py-2.5 text-blue-600 font-bold text-left">{row.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* شريط القائمة السفلي للتنقل السريع الموحد الفاتح */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-3 text-[10px] text-slate-400 z-50 rounded-t-2xl shadow-md">
        <div className="opacity-60 flex flex-col items-center">📊 الرئيسية</div>
        <div className="opacity-60 flex flex-col items-center">🏠 المنزل</div>
        <div className="opacity-60 flex flex-col items-center">🔋 البطارية</div>
        <div className="text-amber-500 font-bold flex flex-col items-center">☀️ الطاقة</div>
        <div className="opacity-60 flex flex-col items-center">💰 المال</div>
      </div>

    </div>
  );
}
