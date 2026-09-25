"use client";

import React, { useState } from 'react';

export default function HomeConsumptionPage() {
  // قيم الاستهلاك اللحظية المتوافقة مع قراءات الصفحة الرئيسية
  const [homeConsumption, setHomeConsumption] = useState<number>(1299); 
  const [appliances, setAppliances] = useState([
    { name: "الأحمال الأساسية والإنارة", power: 350, icon: "💡", status: "نشط" },
    { name: "الأجهزة الكهربائية الثقيلة", power: 949, icon: "🔌", status: "نشط" },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 text-right" dir="rtl">
      
      {/* الهيدر العلوي لتبويب المنزل */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
        <h1 className="text-xl font-bold text-blue-600 flex items-center gap-1.5">
          🏠 استهلاك أحمال المنزل
        </h1>
        <div className="text-xs text-slate-400">قراءة حية</div>
      </div>

      {/* بطاقة السحب الإجمالي للمنزل */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4 text-center">
        <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي سحب المنزل الآن</span>
        <span className="text-4xl font-black text-blue-600 block mt-2">{homeConsumption.toLocaleString()} واط</span>
      </div>

      {/* تفصيل سحب الأجهزة داخل المنزل */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
        <h3 className="font-bold text-sm text-slate-700 mb-3">📋 تفصيل توزيع الأحمال</h3>
        <div className="space-y-3">
          {appliances.map((app, index) => (
            <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
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

      {/* بطاقة التوجيه الذكية للأحمال */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-950 leading-relaxed shadow-sm">
        💡 **حالة الأحمال المنزلية:** معدل استهلاك منزلك الحالي متزن تماماً ويقع ضمن النطاق الآمن والأمثل لقدرة الإنفرتر التشغيلية. التوليد الشمسي يغطي كافة الاحتياجات بكفاءة وبدون سحب من البطارية.
      </div>

    </div>
  );
}
