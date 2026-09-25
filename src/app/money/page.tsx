"use client";

import React, { useState } from 'react';

export default function MoneyDashboard() {
  // إحصاءات مالية تقديرية مبنية على قراءات النظام المتكامل (مطابقة لبيانات تطبيق شمس الأصلي)
  const [totalSaved, setTotalSaved] = useState<number>(6209);       // المبالغ التي وفرها النظام
  const [gridPaid, setGridPaid] = useState<number>(221.2);          // المبالغ المدفوعة للشبكة
  const [estimatedCost, setEstimatedCost] = useState<number>(6472.2); // التكلفة التقديرية لولا النظام
  
  // نسب مصادر الطاقة التقديرية للشهر الحالي
  const energySources = [
    { name: "من الشمس", percentage: 49, amount: "227.5 ك.و.س", color: "bg-amber-500" },
    { name: "من البطارية", percentage: 49, amount: "224.9 ك.و.س", color: "bg-emerald-500" },
    { name: "من الشبكة", percentage: 2, amount: "7 ك.و.س", color: "bg-purple-500" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      
      {/* الهيدر العلوي لتبويب المال */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-1">
          ⚡ الطاقة والمال
        </h1>
        <div className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
          تغطية 61%
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
          <span>ℹ️</span> من أين تأتي كهرباء منزلك؟
        </h3>
        
        {/* شريط النسب المتراكم التفاعلي */}
        <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden mb-4">
          <div className="bg-amber-500 h-full" style={{ width: '49%' }}></div>
          <div className="bg-emerald-500 h-full" style={{ width: '49%' }}></div>
          <div className="bg-purple-500 h-full" style={{ width: '2%' }}></div>
        </div>

        {/* تفاصيل مصادر التغذية */}
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
          <span>🪙</span> المال
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          لولا نظامك الشمسي لدفعت <span className="font-bold text-slate-700">{estimatedCost.toLocaleString()} ل.س</span> للشبكة (تقديرياً).
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* صندوق وفرت بنظامك */}
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl shadow-inner text-center">
            <span className="text-xs text-emerald-700 block mb-1">وفرت بنظامك</span>
            <span className="text-base font-black text-emerald-600">{totalSaved.toLocaleString()} ل.س</span>
          </div>

          {/* صندوق دفعت للشبكة */}
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl shadow-inner text-center">
            <span className="text-xs text-amber-700 block mb-1">دفعت للشبكة</span>
            <span className="text-base font-black text-amber-700">{gridPaid.toLocaleString()} ل.س</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mt-4 text-center">
          طاقة مجهولة المصدر (لا وفر ولا شبكة): 42 ل.س
        </p>
      </div>

      {/* شريط القائمة السفلي الموحد في التطبيق لتسهيل التنقل */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 text-[10px] text-slate-400 shadow-lg z-50 rounded-t-2xl">
        <div className="flex flex-col items-center gap-0.5 opacity-60">
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
        <div className="text-amber-500 font-bold flex flex-col items-center gap-0.5">
          <span className="text-lg">💰</span>المال
        </div>
      </div>

    </div>
  );
}
