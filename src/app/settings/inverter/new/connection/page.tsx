"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const protocols = ["Modbus RTU", "Modbus TCP", "Wi-Fi Datalogger"] as const;
type Protocol = (typeof protocols)[number];

export default function InverterConnectionPage() {
  const router = useRouter();
  const [protocol, setProtocol] = useState<Protocol>("Modbus RTU");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("shamsak_new_inverter_step2");
    if (!saved) {
      router.replace("/settings/inverter/new");
    }
  }, [router]);

  const handleNext = () => {
    const previous = sessionStorage.getItem("shamsak_new_inverter_step2");
    const step2 = previous ? JSON.parse(previous) : {};

    sessionStorage.setItem(
      "shamsak_new_inverter_step3",
      JSON.stringify({
        ...step2,
        protocol,
        inverterAddress: address.trim(),
      }),
    );

    router.push("/settings/inverter/new/review");
  };

  const addressLabel =
    protocol === "Modbus TCP"
      ? "عنوان IP للإنفرتر"
      : protocol === "Modbus RTU"
        ? "عنوان / منفذ الاتصال التسلسلي"
        : "عنوان جهاز الـDatalogger (إن وُجد)";

  const addressPlaceholder =
    protocol === "Modbus TCP"
      ? "مثال: 192.168.1.50"
      : protocol === "Modbus RTU"
        ? "مثال: COM3 أو /dev/ttyUSB0"
        : "مثال: عنوان الجهاز أو الرقم التسلسلي";

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
              إضافة إنفرتر جديد · الخطوة 3 من 4
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              الاتصال بالإنفرتر
            </h1>
            <p className="mt-2 text-base font-medium leading-7 text-slate-500">
              اختر طريقة الاتصال وأدخل عنوان الجهاز إذا كانت طريقة الاتصال تحتاجه.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-4 gap-2" aria-label="خطوات إضافة الإنفرتر">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full ${step <= 3 ? "bg-blue-600" : "bg-slate-200"}`}
              />
            ))}
          </div>

          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-base font-bold text-slate-700">
                بروتوكول الاتصال
              </span>
              <select
                value={protocol}
                onChange={(event) => setProtocol(event.target.value as Protocol)}
                className={inputClass + " appearance-auto"}
              >
                {protocols.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-base font-bold text-slate-700">{addressLabel}</span>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={addressPlaceholder}
                className={inputClass}
                autoComplete="off"
              />
            </label>

            <button
              type="button"
              onClick={handleNext}
              className="min-h-14 w-full rounded-xl bg-blue-600 px-4 text-lg font-bold text-white shadow-sm transition active:scale-95 hover:bg-blue-700"
            >
              التالي · مراجعة الإعدادات
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
