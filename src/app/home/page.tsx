"use client";

import React, { useState } from 'react';

export default function HomeConsumptionPage() {
  // توحيد قراءة السحب اللحظي لتطابق تماماً قيمة 1.30 kW المعروضة في الدائرة الرئيسية
  const [homeConsumption] = useState<number>(1300); 
  
  // قائمة تفصيلية تفاعلية بالأحمال المنزلية النشطة الآن
  const appliances = [
    { name: "الإنارة والأحمال الأساسية الثابتة", power: 350, icon: "💡", status: "نشط" },
    { name: "الأجهزة الكهربائية (براد وتبريد خفيف)", power: 950, icon: "🔌", status: "نشط" },
  ];

  return (
    <div className="w-full text-right" dir="rtl">
      
      {/* الهيدر العلوي الأبيض النظيف لتبويب المنزل */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm mb-5 border border-slate-100">
        <h1 className="text-2xl font-extrabold text-blue-600 flex items-center gap-1.5">
          🏠 استهلاك أحمال المنزل
        </h1>
        <div className="text-base font-semibold text-slate-500">قراءة حية موحدة</div>
      </div>

      {/* بطاقة السحب الإجمالي للمنزل بالواط (1300 واط تعادل 1.30 kW) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 text-center">
        <span className="text-base font-semibold text-slate-400 block mb-1">إجمالي سحب المنزل الآن</span>
        <span className="text-5xl font-black text-blue-600 block mt-2">{(homeConsumption).toLocaleString()} واط</span>
        <span className="text-[10px] text-slate-400 font-semibold block mt-1">kW 1.30</span>
      </div>

      {/* تفصيل توزيع الأحمال المنزلية الحالية */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
        <h3 className="font-bold text-xl font-black text-slate-700 mb-3">📋 تفصيل توزيع الأحمال</h3>
        <div className="space-y-3">
          {appliances.map((app, index) => (
            <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-base">
              <div className="flex items-center gap-2">
                <span className="text-lg">{app.icon}</span>
                <span className="text-slate-700 font-medium">{app.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-900 font-bold">{app.power} واط</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">{app.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* بطاقة التوجيه والتحليل الذكية للأحمال المستوحاة من المنظومة الحقيقية */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-950 leading-relaxed shadow-sm">
        💡 **حالة الأحمال المنزلية:** معدل استهلاك منزلك الحالي متزن ومثالي جداً. التوليد الشمسي الحالي (5.83 kW) يغطي كافة احتياجات الأجهزة المنزلية بكفاءة عالية جداً، ويتم توجيه فائض ضخم مستقر لشحن البطاريات دون الحاجة للسحب منها.
      </div>

      {/* شريط القائمة السفلي الموحد الفاتح للتنقل السريع */}
    </div>
  );
}
