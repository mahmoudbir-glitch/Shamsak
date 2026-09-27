"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InverterSpecsPage() {
  const router = useRouter();
  const [panelCapacity, setPanelCapacity] = useState("");
  const [batteryCapacity, setBatteryCapacity] = useState("");
  const [error, setError] = useState("");

  const handleNext = () => {
    const panel = Number(panelCapacity);
    const battery = Number(batteryCapacity);

    if (!panelCapacity.trim() || !batteryCapacity.trim()) {
      setError("أدخل قدرة الألواح وسعة البطاريات للمتابعة.");
      return;
    }

    if (!Number.isFinite(panel) || panel <= 0 || !Number.isFinite(battery) || battery <= 0) {
      setError("أدخل أرقامًا صحيحة أكبر من صفر لقدرة الألواح وسعة البطاريات.");
      return;
    }

    const previous = sessionStorage.getItem("shamsak_new_inverter_step1");
    const step1 = previous ? JSON.parse(previous) : {};

    sessionStorage.setItem(
      "shamsak_new_inverter_step2",
      JSON.stringify({
        ...step1,
        panelCapacity: panelCapacity.trim(),
        batteryCapacity: batteryCapacity.trim(),
      }),
    );

    setError("");
    router.push("/settings/inverter/new/connection");
  };

  const inputClass =
    "w-full min-h-14 rounded-xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

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
              إضافة إنفرتر جديد · الخطوة 2 من 4
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              مواصفات النظام
            </h1>
            <p className="mt-2 text-base font-medium leading-7 text-slate-500">
              أدخل قدرة الألواح وسعة خزان البطاريات لاستخدامها في حسابات الطاقة.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-4 gap-2" aria-label="خطوات إضافة الإنفرتر">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full ${step <= 2 ? "bg-blue-600" : "bg-slate-200"}`}
              />
            ))}
          </div>

          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-base font-bold text-slate-700">
                إجمالي قدرة الألواح
              </span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={panelCapacity}
                  onChange={(event) => {
                    setPanelCapacity(event.target.value);
                    setError("");
                  }}
                  placeholder="مثلاً: 6"
                  className={inputClass + " pl-16"}
                />
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500">
                  kW
                </span>
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-base font-bold text-slate-700">
                سعة خزان البطاريات الإجمالية
              </span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={batteryCapacity}
                  onChange={(event) => {
                    setBatteryCapacity(event.target.value);
                    setError("");
                  }}
                  placeholder="مثلاً: 4800"
                  className={inputClass + " pl-16"}
                />
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500">
                  Wh
                </span>
              </div>
            </label>

            {error && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="min-h-14 w-full rounded-xl bg-blue-600 px-4 text-lg font-bold text-white shadow-sm transition active:scale-95 hover:bg-blue-700"
            >
              التالي · الاتصال
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
