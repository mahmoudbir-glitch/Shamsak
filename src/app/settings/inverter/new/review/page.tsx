"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Setup = {
  systemName?: string;
  manufacturer?: string;
  model?: string;
  panelCapacity?: string;
  batteryCapacity?: string;
  protocol?: string;
  inverterAddress?: string;
};

export default function InverterReviewPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("shamsak_new_inverter_step3");
    if (!saved) {
      router.replace("/settings/inverter/new");
      return;
    }
    try {
      setSetup(JSON.parse(saved));
    } catch {
      router.replace("/settings/inverter/new");
    }
  }, [router]);

  if (!setup) return null;

  const rows = [
    ["اسم النظام", setup.systemName || "—"],
    ["الشركة المصنعة", setup.manufacturer || "—"],
    ["الموديل", setup.model || "—"],
    ["قدرة الألواح", setup.panelCapacity ? setup.panelCapacity + " kW" : "—"],
    ["سعة البطاريات", setup.batteryCapacity ? setup.batteryCapacity + " Wh" : "—"],
    ["بروتوكول الاتصال", setup.protocol || "—"],
    ["عنوان / منفذ الاتصال", setup.inverterAddress || "—"],
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-28 text-right" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 text-sm font-bold text-slate-500"
        >
          ← العودة
        </button>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-black text-blue-600">
              إضافة إنفرتر جديد · الخطوة 4 من 4
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              مراجعة الإعدادات
            </h1>
            <p className="mt-2 text-base font-medium leading-7 text-slate-500">
              راجع البيانات التي أدخلتها قبل الحفظ.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-4 gap-2" aria-label="خطوات إضافة الإنفرتر">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="h-2 rounded-full bg-blue-600" />
            ))}
          </div>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm font-bold text-slate-500">{label}</span>
                <span className="text-base font-black text-slate-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
            هذه الشاشة للمراجعة فقط. لم يتم حفظ الإعدادات نهائيًا بعد.
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-5 min-h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-lg font-bold text-slate-700 shadow-sm"
          >
            تعديل البيانات
          </button>
        </section>
      </div>
    </main>
  );
}