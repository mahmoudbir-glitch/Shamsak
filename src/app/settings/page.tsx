"use client";

import React, { useState } from 'react';

export default function MoneyDashboard() {
  // إحصاءات مالية تقديرية مبنية على قيم قراءات واجهة "شمسك" الدائرية
  const [totalSaved] = useState<number>(6209);       // المبالغ التي وفرها النظام بالليرة (ل.س)
  const [gridPaid] = useState<number>(221.2);          // المبالغ المدفوعة للشبكة
  const [estimatedCost] = useState<number>(6430.2); // التكلفة التقديرية التوتال لولا وجود النظام
  
  // نسب مصادر الطاقة التقديرية للشهر الحالي الموحدة مع لوحة التحكم
  const energySources = [
    { name: "من الشمس مباشرة", percentage: 49, amount: "227.5 ك.و.س", color: "bg-amber-500" },
    { name: "من البطارية (توليد شمسي مخزن)", percentage: 49, amount: "224.9 ك.و.س", color: "bg-emerald-500" },
    { name: "من الشبكة الرسمية", percentage: 2, amount: "7.0 ك.و.س", color: "bg-purple-500" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      
      {/* الهيدر العلوي لتبويب المال */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-1">
          ⚡ الطاقة والمال
        </h1>
        <div className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
          تغطية ونسب مستقرة
        </div>
      </div>

      {/* الفلتر الزمني السفلي للهيدر */}
      <div className="grid grid-cols-3 gap-2 bg-slate-200 bg-opacity-60 p-1 rounded-xl mb-6 text-center text-xs font-bold text-slate-600">
        <div className="py-2 rounded-lg">يوم</div>
        <div className="py-2 rounded-lg">أسبوع</div>
        <div className="bg-slate-900 text-white py-2 rounded-lg shadow-sm">شهر</div>
      </div>

      {/* القسم 1: من أين تأتي كهرباء منزلك؟ */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
        <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-1">
          <span>ℹ️</span> من أين تأتي كهرباء منزلك هذا الشهر؟
        </h3>
        
        {/* شريط النسب المتراكم التفاعلي الملون */}
        <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden mb-4">
          <div className="bg-amber-500 h-full" style={{ width: '49%' }}></div>
          <div className="bg-emerald-500 h-full" style={{ width: '49%' }}></div>
          <div className="bg-purple-500 h-full" style={{ width: '2%' }}></div>
        </div>

        {/* تفاصيل مصادر التغذية بالألوان */}
        <div className="space-y-3">
          {energySources.map((source, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${source.color}`}></span>
                <span className="text-slate-600 font-medium">{source.name}</span>
              </div>
              <div className="text-slate-900 font-bold">
                {source.percentage}% <span className="text-slate-400 font-normal mr-1">({source.amount})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* القسم 2: تفصيل الفاتورة والتوفير المالي للمنظومة */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h3 className="font-bold text-sm text-slate-700 mb-1 flex items-center gap-1">
          <span>🪙</span> التحليل المالي التقديري
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          لولا نظامك الشمسي المطور لدفعت <span className="font-bold text-slate-700">{estimatedCost.toLocaleString()} ل.س</span> للشبكة.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* صندوق وفرت بنظامك الأخضر */}
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl shadow-inner text-center">
            <span className="text-xs text-emerald-700 block mb-1">وفرت بنظامك</span>
            <span className="text-base font-black text-emerald-600">{totalSaved.toLocaleString()} ل.س</span>
          </div>

          {/* صندوق دفعت للشبكة الأصفر */}
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl shadow-inner text-center">
            <span className="text-xs text-amber-700 block mb-1">دفعت للشبكة</span>
            <span className="text-base font-black text-amber-700">{gridPaid.toLocaleString()} ل.س</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mt-4 text-center">
          حالة الفاتورة محدثة بناءً على كفاءة التوليد الجارية لـ شمسك.
        </p>
      </div>

      {/* شريط القائمة السفلي الموحد الفاتح للتنقل السريع */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-3 text-[10px] text-slate-400 z-50 rounded-t-2xl shadow-md">
        <div className="opacity-60 flex flex-col items-center">📊 الرئيسية</div>
        <div className="opacity-60 flex flex-col items-center">🏠 المنزل</div>
        <div className="opacity-60 flex flex-col items-center">🔋 البطارية</div>
        <div className="opacity-60 flex flex-col items-center">☀️ الطاقة</div>
        <div className="text-amber-500 font-bold flex flex-col items-center">💰 المال</div>
      </div>

    </div>
  );
}
