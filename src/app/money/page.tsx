"use client";

import { useEffect, useMemo, useState } from "react";

type FinanceData = {
  periodDays: number;
  totals: {
    solarKWh: number;
    homeKWh: number;
    batteryDischargeKWh: number;
    gridImportKWh: number;
    gridExportKWh: number;
  };
  sources: {
    solarPct: number;
    batteryPct: number;
    gridPct: number;
    solarKWh: number;
    batteryKWh: number;
    gridKWh: number;
  };
};

export default function MoneyDashboard() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [tariff, setTariff] = useState(0);
  const [exportTariff, setExportTariff] = useState(0);
  const [currency, setCurrency] = useState("ل.س");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTariff(Number(localStorage.getItem("shamsak_grid_tariff") || 0));
    setExportTariff(Number(localStorage.getItem("shamsak_export_tariff") || 0));
    setCurrency(localStorage.getItem("shamsak_currency") || "ل.س");
    fetch("/api/finance", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("finance_unavailable")))
      .then((value) => setData(value as FinanceData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const saved = useMemo(() => {
    if (!data) return 0;
    return data.sources.solarKWh * tariff + data.sources.batteryKWh * tariff + data.totals.gridExportKWh * exportTariff;
  }, [data, tariff, exportTariff]);

  const gridCost = data ? data.totals.gridImportKWh * tariff : 0;
  const hypotheticalCost = data ? (data.sources.solarKWh + data.sources.batteryKWh + data.totals.gridImportKWh) * tariff : 0;

  const sourceRows = data ? [
    { name: "من الشمس مباشرة", pct: data.sources.solarPct, kwh: data.sources.solarKWh, color: "bg-amber-500" },
    { name: "من البطارية", pct: data.sources.batteryPct, kwh: data.sources.batteryKWh, color: "bg-emerald-500" },
    { name: "من الشبكة", pct: data.sources.gridPct, kwh: data.sources.gridKWh, color: "bg-purple-500" },
  ] : [];

  return (
    <div className="w-full space-y-5 text-right" dir="rtl">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">💰 التحليل المالي ومصادر الكهرباء</h1>
        <p className="mt-2 text-base font-semibold text-slate-500">بيانات آخر {data?.periodDays ?? 30} يوماً المسجلة في النظام.</p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">⚡ من أين تأتي كهرباء منزلك؟</h2>
        {loading ? <p className="mt-4 text-base font-bold text-slate-500">جاري تحميل التحليل…</p> : !data ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-base font-semibold text-slate-600">لا توجد ملخصات طاقة مسجلة بعد.</p>
        ) : (
          <>
            <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100">
              {sourceRows.map((row) => <div key={row.name} className={row.color} style={{ width: String(row.pct) + "%" }} />)}
            </div>
            <div className="mt-5 space-y-3">
              {sourceRows.map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className={"h-4 w-4 rounded-full " + row.color} />
                    <span className="text-base font-semibold text-slate-700">{row.name}</span>
                  </div>
                  <strong className="text-lg font-extrabold text-slate-900">{row.pct}% • {row.kwh.toFixed(1)} ك.و.س</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">🪙 حاسبة الوفر المالي</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <span className="text-base font-semibold text-slate-500">سعر الكيلوواط من الشبكة</span>
            <strong className="mt-1 block text-xl font-extrabold text-slate-900">{tariff.toLocaleString()} {currency}</strong>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <span className="text-base font-semibold text-slate-500">تكلفة الشبكة الفعلية</span>
            <strong className="mt-1 block text-xl font-extrabold text-purple-700">{gridCost.toLocaleString()} {currency}</strong>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <span className="text-base font-semibold text-emerald-700">وفرت بنظامك</span>
            <strong className="mt-1 block text-2xl font-black text-emerald-700">{saved.toLocaleString()} {currency}</strong>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <span className="text-base font-semibold text-amber-700">تكلفة افتراضية بلا الشمس</span>
            <strong className="mt-1 block text-2xl font-black text-amber-700">{hypotheticalCost.toLocaleString()} {currency}</strong>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500">الحساب تقديري ويعتمد على سعر الكيلوواط الذي تضبطه في الإعدادات وعلى الطاقة المسجلة فعلياً.</p>
      </section>
    </div>
  );
}
