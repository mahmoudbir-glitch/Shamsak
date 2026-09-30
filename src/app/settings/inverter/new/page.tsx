"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const manufacturers = ["Growatt", "Deye-Sunsynk", "Felicity Solar", "Solis", "Huawei", "أخرى"] as const;
type Manufacturer = (typeof manufacturers)[number];

export default function NewInverterPage() {
  const router = useRouter();
  const [systemName, setSystemName] = useState("");
  const [manufacturer, setManufacturer] = useState<Manufacturer>("Growatt");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!systemName.trim()) {
      setError("أدخل اسم الجهاز أو الموقع للمتابعة.");
      return;
    }

    sessionStorage.setItem(
      "shamsak_new_inverter_step1",
      JSON.stringify({
        systemName: systemName.trim(),
        manufacturer,
        model: model.trim(),
      }),
    );

    setError("");
    router.push("/settings/inverter/new/specs");
  };

  const inputClass =
    "w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="w-full space-y-4 pb-28 text-right" dir="rtl">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-2 inline-flex min-h-10 items-center rounded-xl px-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
        >
          ← العودة
        </button>

        <section className="energy-card border-blue-100 p-4 sm:p-5">
          <div className="mb-5">
            <p className="text-sm font-black text-blue-600">إضافة إنفرتر جديد · الخطوة 1 من 4</p>
            <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">معلومات الجهاز الأساسية</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500 sm:text-base sm:leading-7">
              أدخل اسم الموقع والشركة والموديل قبل الانتقال إلى مواصفات النظام.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-4 gap-2" aria-label="خطوات إضافة الإنفرتر">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full ${step === 1 ? "bg-blue-600" : "bg-slate-200"}`}
              />
            ))}
          </div>

          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-base font-bold text-slate-700">اسم الجهاز / الموقع</span>
              <input
                value={systemName}
                onChange={(event) => {
                  setSystemName(event.target.value);
                  setError("");
                }}
                placeholder="مثلاً: المنزل الرئيسي"
                className={inputClass}
                autoComplete="off"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-base font-bold text-slate-700">الشركة المصنّعة</span>
              <select
                value={manufacturer}
                onChange={(event) => setManufacturer(event.target.value as Manufacturer)}
                className={inputClass + " appearance-auto"}
              >
                {manufacturers.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-base font-bold text-slate-700">موديل الإنفرتر</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="مثلاً: MIN 5000TL-X"
                className={inputClass}
                autoComplete="off"
              />
            </label>

            {error && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="min-h-12 w-full rounded-xl bg-blue-600 px-4 text-base font-bold text-white shadow-sm transition active:scale-95 hover:bg-blue-700"
            >
              التالي · مواصفات النظام
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
