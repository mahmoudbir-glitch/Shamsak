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
  const [notifySurplus, setNotifySurplus] = useState(true);
  const [notifyLowBattery, setNotifyLowBattery] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTariff(Number(localStorage.getItem("shamsak_grid_tariff") || 0));
    setExportTariff(Number(localStorage.getItem("shamsak_export_tariff") || 0));
    setCurrency(localStorage.getItem("shamsak_currency") || "ل.س");
    const savedNotifySurplus = localStorage.getItem("shamsak_notify_surplus");
    const savedNotifyLowBattery = localStorage.getItem("shamsak_notify_low_battery");
    if (savedNotifySurplus !== null) setNotifySurplus(savedNotifySurplus !== "false");
    if (savedNotifyLowBattery !== null) setNotifyLowBattery(savedNotifyLowBattery !== "false");
    fetch("/api/finance", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("finance_unavailable")))
      .then((value) => setData(value as FinanceData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const savedAmount = useMemo(() => {
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

  const handleSave = () => {
    localStorage.setItem("shamsak_currency", currency);
    localStorage.setItem("shamsak_grid_tariff", String(tariff));
    localStorage.setItem("shamsak_export_tariff", String(exportTariff));
    localStorage.setItem("shamsak_notify_surplus", String(notifySurplus));
    localStorage.setItem("shamsak_notify_low_battery", String(notifyLowBattery));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const inputClass = "w-full min-h-14 rounded-xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const selectClass = inputClass + " appearance-auto";

  return (
    <div className="w-full space-y-4 rounded-[2rem] bg-gradient-to-b from-cyan-50/60 via-white/40 to-white/20 p-2 text-right sm:p-3" dir="rtl">
      <div className="energy-card p-5">
        <h1 className="text-2xl font-black text-slate-950">💰 التحليل المالي ومصادر الكهرباء</h1>
        <p className="mt-2 text-base font-semibold text-slate-500">بيانات آخر {data?.periodDays ?? 30} يوماً المسجلة في النظام.</p>
      </div>

      <section className="energy-card p-5">
        <h2 className="text-xl font-black text-slate-900">⚡ من أين تأتي كهرباء منزلك؟</h2>
        {loading ? <p className="mt-4 text-base font-bold text-slate-500">جاري تحميل التحليل…</p> : !data ? (
          <p className="mt-4 rounded-xl bg-sky-50/70 p-4 text-base font-semibold text-slate-600">لا توجد ملخصات طاقة مسجلة بعد.</p>
        ) : (
          <>
            <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100">
              {sourceRows.map((row) => <div key={row.name} className={row.color} style={{ width: String(row.pct) + "%" }} />)}
            </div>
            <div className="mt-5 space-y-3">
              {sourceRows.map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-xl bg-sky-50/70 p-4">
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

      <section className="energy-card p-5">
        <h2 className="text-xl font-black text-slate-900">🪙 حاسبة الوفر المالي</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-sky-50/70 p-4">
            <span className="text-base font-semibold text-slate-500">سعر الكيلوواط من الشبكة</span>
            <strong className="mt-1 block text-xl font-extrabold text-slate-900">{tariff.toLocaleString()} {currency}</strong>
          </div>
          <div className="rounded-xl bg-sky-50/70 p-4">
            <span className="text-base font-semibold text-slate-500">تكلفة الشبكة الفعلية</span>
            <strong className="mt-1 block text-xl font-extrabold text-purple-700">{gridCost.toLocaleString()} {currency}</strong>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4">
            <span className="text-base font-semibold text-emerald-700">وفرت بنظامك</span>
            <strong className="mt-1 block text-2xl font-black text-emerald-700">{savedAmount.toLocaleString()} {currency}</strong>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <span className="text-base font-semibold text-amber-700">تكلفة افتراضية بلا الشمس</span>
            <strong className="mt-1 block text-2xl font-black text-amber-700">{hypotheticalCost.toLocaleString()} {currency}</strong>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500">الحساب تقديري ويعتمد على سعر الكيلوواط الذي تضبطه في الإعدادات وعلى الطاقة المسجلة فعلياً.</p>
      </section>

      <section className="energy-card space-y-4 p-5">
        <h2 className="border-b border-slate-100 pb-3 text-xl font-black text-slate-900">💰 التفضيلات المالية</h2>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">العملة المحلية لحساب التوفير</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
            <option value="ل.س">ليرة سورية (ل.س)</option><option value="USD">دولار أمريكي ($)</option><option value="LBP">ليرة لبنانية (L.B.P)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">سعر شراء الكهرباء من الشبكة لكل ك.و.س</label>
          <input type="number" min="0" value={tariff} onChange={(e) => setTariff(Number(e.target.value))} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">سعر بيع/تصدير الفائض لكل ك.و.س</label>
          <input type="number" min="0" value={exportTariff} onChange={(e) => setExportTariff(Number(e.target.value))} className={inputClass} />
        </div>
      </section>

      <section className="energy-card space-y-4 p-5">
        <h2 className="border-b border-slate-100 pb-3 text-xl font-black text-slate-900">🔔 التنبيهات</h2>
        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl bg-sky-50/70 px-4 py-3 text-base font-semibold text-slate-700">
          <span>تنبيهي عند وجود فائض طاقة غير مستغل</span>
          <input type="checkbox" checked={notifySurplus} onChange={(e) => setNotifySurplus(e.target.checked)} className="h-7 w-7 shrink-0 accent-amber-500" />
        </label>
        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl bg-sky-50/70 px-4 py-3 text-base font-semibold text-slate-700">
          <span>تنبيهي عند اقتراب البطارية من حد الأمان (10%)</span>
          <input type="checkbox" checked={notifyLowBattery} onChange={(e) => setNotifyLowBattery(e.target.checked)} className="h-7 w-7 shrink-0 accent-emerald-500" />
        </label>
      </section>

      {saved && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-base font-black text-emerald-700">✓ تم حفظ التفضيلات المالية والتنبيهات بنجاح</div>}

      <button type="button" onClick={handleSave} className="mb-4 min-h-16 w-full rounded-2xl bg-slate-900 px-5 py-4 text-lg font-bold text-white shadow-md transition active:scale-95 active:bg-slate-800">
        حفظ وتثبيت الإعدادات في ذاكرة الهاتف
      </button>
    </div>
  );
}