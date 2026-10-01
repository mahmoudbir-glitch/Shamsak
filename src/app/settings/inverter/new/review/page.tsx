"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AC_VOLTS } from "@/lib/energy";

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

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

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setMessage("");
    try {
      const response = await fetch("/api/inverter/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemName: setup.systemName,
          inverterModel: setup.model || "Inverter",
          manufacturer: setup.manufacturer,
          protocol: setup.protocol,
          inverterAddress: setup.inverterAddress,
          wifiSsid: "",
          panelCapacityKw: Number(setup.panelCapacity || 0),
          batteryCapacityWh: Number(setup.batteryCapacity || 0),
        }),
      });
      if (!response.ok) throw new Error("save_failed");

      localStorage.setItem("shamsak_new_inverter", JSON.stringify(setup));
      localStorage.setItem("shamsak_panel_capacity_kw", String(Number(setup.panelCapacity || 0)));
      localStorage.setItem("shamsak_battery_capacity_wh", String(Number(setup.batteryCapacity || 0)));
      setSaved(true);
      setMessage("✓ تم حفظ إعدادات الإنفرتر والطاقة بنجاح.");
      sessionStorage.removeItem("shamsak_new_inverter_step1");
      sessionStorage.removeItem("shamsak_new_inverter_step2");
      sessionStorage.removeItem("shamsak_new_inverter_step3");
    } catch {
      setMessage("تعذر حفظ الإعدادات. تأكد من اتصال الخادم بقاعدة البيانات ثم حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    ["اسم النظام", setup.systemName || "—"],
    ["الشركة المصنعة", setup.manufacturer || "—"],
    ["الموديل", setup.model || "—"],
    ["قدرة الألواح", setup.panelCapacity ? `${setup.panelCapacity} kW ≈ ${((Number(setup.panelCapacity) * 1000) / AC_VOLTS).toFixed(1)} A` : "—"],
    ["سعة البطاريات", setup.batteryCapacity ? setup.batteryCapacity + " Wh" : "—"],
    ["بروتوكول الاتصال", setup.protocol || "—"],
    ["عنوان / منفذ الاتصال", setup.inverterAddress || "—"],
  ];

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
            <p className="text-sm font-black text-blue-600">
              إضافة إنفرتر جديد · الخطوة 4 من 4
            </p>
            <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
              مراجعة الإعدادات
            </h1>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500 sm:text-base sm:leading-7">
              راجع البيانات التي أدخلتها قبل الحفظ.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-4 gap-2" aria-label="خطوات إضافة الإنفرتر">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="h-1.5 rounded-full bg-blue-600" />
            ))}
          </div>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm font-bold text-slate-500">{label}</span>
                <span dir={label === "عنوان / منفذ الاتصال" ? "ltr" : undefined} className="text-base font-black text-slate-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
            {saved
              ? "تم تثبيت الإعدادات في الخادم. يمكنك العودة إلى الإعدادات لمراجعتها."
              : "هذه الشاشة للمراجعة فقط. لم يتم حفظ الإعدادات نهائيًا بعد."}
          </div>

          {message && (
            <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            className="mt-5 min-h-12 w-full rounded-xl bg-blue-600 px-4 text-base font-bold text-white shadow-sm transition active:scale-95 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ وتثبيت الإنفرتر"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-700 shadow-sm"
          >
            تعديل البيانات
          </button>
        </section>
      </div>
    </main>
  );
}