"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { moneyTone, semanticBg, semanticBorder, semanticText } from "@/lib/energy";

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

const sourceStyles = [
  {
    key: "solar",
    name: "الشمس مباشرة",
    short: "شمس",
    color: "bg-cyan-500",
    soft: "bg-cyan-50",
    text: "text-cyan-700",
  },
  {
    key: "battery",
    name: "البطارية",
    short: "بطارية",
    color: "bg-emerald-500",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
  },
  {
    key: "grid",
    name: "الشبكة",
    short: "شبكة",
    color: "bg-violet-500",
    soft: "bg-violet-50",
    text: "text-violet-700",
  },
] as const;

function formatNumber(value: number, digits = 1) {
  return value.toLocaleString("ar-u-nu-latn", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function MoneyDashboard() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [tariff, setTariff] = useState(0);
  const [exportTariff, setExportTariff] = useState(0);
  const [currency, setCurrency] = useState("ل.س");
  const [notifySurplus, setNotifySurplus] = useState(true);
  const [notifyLowBattery, setNotifyLowBattery] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedNotifySurplus = localStorage.getItem("shamsak_notify_surplus");
    const savedNotifyLowBattery = localStorage.getItem("shamsak_notify_low_battery");

    if (savedNotifySurplus !== null) setNotifySurplus(savedNotifySurplus !== "false");
    if (savedNotifyLowBattery !== null) setNotifyLowBattery(savedNotifyLowBattery !== "false");

    Promise.all([
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/finance", { cache: "no-store" }),
    ])
      .then(async ([settingsResponse, financeResponse]) => {
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          setTariff(Number(settings.gridTariff || 0));
          setExportTariff(Number(settings.exportTariff || 0));
          setCurrency(String(settings.currency || "ل.س"));
        }

        if (financeResponse.ok) {
          setData(await financeResponse.json());
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const savedAmount = useMemo(() => {
    if (!data) return 0;
    return (
      data.sources.solarKWh * tariff +
      data.sources.batteryKWh * tariff +
      data.totals.gridExportKWh * exportTariff
    );
  }, [data, tariff, exportTariff]);

  const gridCost = data ? data.totals.gridImportKWh * tariff : 0;
  const savedTone = moneyTone(savedAmount);
  const costTone = moneyTone(-gridCost);
  const hypotheticalCost = data
    ? (data.sources.solarKWh + data.sources.batteryKWh + data.totals.gridImportKWh) * tariff
    : 0;

  const sourceRows = data
    ? sourceStyles.map((style) => {
        const values = {
          solar: { pct: data.sources.solarPct, kwh: data.sources.solarKWh },
          battery: { pct: data.sources.batteryPct, kwh: data.sources.batteryKWh },
          grid: { pct: data.sources.gridPct, kwh: data.sources.gridKWh },
        }[style.key];

        return { ...style, pct: values.pct, kwh: values.kwh };
      })
    : [];

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, gridTariff: tariff, exportTariff }),
      });

      if (!response.ok) throw new Error("settings_save_failed");

      localStorage.setItem("shamsak_notify_surplus", String(notifySurplus));
      localStorage.setItem("shamsak_notify_low_battery", String(notifyLowBattery));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base font-bold text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100";
  const selectClass = inputClass + " appearance-auto";

  return (
    <div className="w-full space-y-3 pb-4 text-right" dir="rtl">
      <PageHeader icon={Wallet} tone="sky" eyebrow="شمسك • المال" title="التحليل المالي ومصادر الكهرباء" subtitle={data?.periodDays ? `مصادر الكهرباء والوفر خلال آخر ${data.periodDays} يوماً.` : "مصادر الكهرباء والوفر من قراءات منظومتك."} />

      {loading ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-sm font-black text-slate-600">جاري تجهيز التحليل…</div>
        </section>
      ) : !data || !data.periodDays ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">📊</div>
          <h2 className="mt-3 text-base font-black text-slate-900">لا توجد بيانات كافية بعد</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            يُحسب الوفر ومصادر الكهرباء بعد تجمّع يوم كامل من القراءات، وستظهر هنا تلقائياً بدل الأصفار.
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500">استهلاك المنزل</span>
              <strong className="mt-1 block text-lg font-black text-slate-950">
                {formatNumber(data.totals.homeKWh)} <small className="text-[10px]">ك.و.س</small>
              </strong>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3 shadow-sm">
              <span className="text-[10px] font-bold text-cyan-700">من الشمس</span>
              <strong className="mt-1 block text-lg font-black text-cyan-800">
                {formatNumber(data.sources.solarKWh)} <small className="text-[10px]">ك.و.س</small>
              </strong>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-700">من البطارية</span>
              <strong className="mt-1 block text-lg font-black text-emerald-800">
                {formatNumber(data.sources.batteryKWh)} <small className="text-[10px]">ك.و.س</small>
              </strong>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3 shadow-sm">
              <span className="text-[10px] font-bold text-violet-700">من الشبكة</span>
              <strong className="mt-1 block text-lg font-black text-violet-800">
                {formatNumber(data.sources.gridKWh)} <small className="text-[10px]">ك.و.س</small>
              </strong>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">⚡ مصادر الكهرباء</h2>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">كيف تم تغطية استهلاك المنزل؟</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                آخر {data.periodDays} يوم
              </span>
            </div>

            <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
              {sourceRows.map((row) => (
                <div
                  key={row.key}
                  className={row.color}
                  style={{ width: String(Math.max(0, Math.min(100, row.pct))) + "%" }}
                  title={row.name}
                />
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {sourceRows.map((row) => (
                <div key={row.key} className={"rounded-xl p-3 " + row.soft}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={"h-2.5 w-2.5 rounded-full " + row.color} />
                      <span className={"text-xs font-black " + row.text}>{row.name}</span>
                    </div>
                    <strong className="text-sm font-black text-slate-900">{row.pct}%</strong>
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">{formatNumber(row.kwh)} ك.و.س</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950">💰 الصورة المالية</h2>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">تقدير مبني على التعرفة المسجلة</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <div className={"rounded-2xl border p-4 " + semanticBorder[savedTone] + " " + semanticBg[savedTone]}>
                <span className={"text-[11px] font-bold " + semanticText[savedTone]}>الوفر التقديري</span>
                <strong className={"mt-1 block text-2xl font-black " + semanticText[savedTone]}>
                  {savedAmount.toLocaleString()} {currency}
                </strong>
                <span className="mt-1 block text-[10px] font-semibold opacity-75">من الشمس والبطارية والتصدير</span>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <span className={"text-[11px] font-bold " + semanticText[costTone]}>تكلفة الشبكة الفعلية</span>
                <strong className={"mt-1 block text-2xl font-black " + semanticText[costTone]}>
                  {gridCost.toLocaleString()} {currency}
                </strong>
                <span className="mt-1 block text-[10px] font-semibold text-slate-500">
                  {formatNumber(data.totals.gridImportKWh)} ك.و.س مشتراة
                </span>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <span className="text-[11px] font-bold text-amber-700">تكلفة افتراضية بلا النظام الشمسي</span>
                <strong className="mt-1 block text-xl font-black text-amber-800">
                  {hypotheticalCost.toLocaleString()} {currency}
                </strong>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <span className="text-[11px] font-bold text-sky-700">الفائض المصدّر</span>
                <strong className="mt-1 block text-xl font-black text-sky-800">
                  {formatNumber(data.totals.gridExportKWh)} ك.و.س
                </strong>
              </div>
            </div>

            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-semibold leading-5 text-slate-500">
              ملاحظة: الأرقام تقديرية وتعتمد على الطاقة المسجلة وتعرفة الشراء والتصدير التي تضبطها في الإعدادات.
            </p>
          </section>
        </>
      )}

      <details className="group rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="text-base font-black text-slate-950">⚙️ التفضيلات المالية</h2>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">العملة وتعرفة الشبكة والتصدير</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600 group-open:bg-cyan-50 group-open:text-cyan-700">
            تعديل
          </span>
        </summary>

        <div className="space-y-3 border-t border-slate-100 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-700">العملة</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
                <option value="ل.س">ليرة سورية (ل.س)</option>
                <option value="USD">دولار أمريكي ($)</option>
                <option value="LBP">ليرة لبنانية (L.B.P)</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-700">شراء الشبكة / ك.و.س</span>
              <input type="number" min="0" value={tariff} onChange={(e) => setTariff(Number(e.target.value))} className={inputClass} />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-700">تصدير الفائض / ك.و.س</span>
              <input type="number" min="0" value={exportTariff} onChange={(e) => setExportTariff(Number(e.target.value))} className={inputClass} />
            </label>
          </div>
        </div>
      </details>

      <details className="group rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <div>
            <h2 className="text-base font-black text-slate-950">🔔 التنبيهات المالية والطاقة</h2>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">اختر التنبيهات التي تريدها</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600 group-open:bg-amber-50 group-open:text-amber-700">
            إعداد
          </span>
        </summary>

        <div className="space-y-2 border-t border-slate-100 p-4">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700">
            <span>تنبيهي عند وجود فائض طاقة غير مستغل</span>
            <input type="checkbox" checked={notifySurplus} onChange={(e) => setNotifySurplus(e.target.checked)} className="h-5 w-5 shrink-0 accent-amber-500" />
          </label>
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700">
            <span>تنبيهي عند اقتراب البطارية من حد الأمان (10%)</span>
            <input type="checkbox" checked={notifyLowBattery} onChange={(e) => setNotifyLowBattery(e.target.checked)} className="h-5 w-5 shrink-0 accent-emerald-500" />
          </label>
        </div>
      </details>

      {saved && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-black text-emerald-700">
          ✓ تم حفظ التفضيلات بنجاح
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="sticky bottom-3 z-20 min-h-14 w-full rounded-2xl bg-slate-950 px-5 py-3 text-base font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.2)] transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
      >
        {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
      </button>
    </div>
  );
}
