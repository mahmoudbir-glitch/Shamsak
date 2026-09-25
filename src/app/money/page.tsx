"use client";

import { useEffect, useState } from "react";
import { BatteryCharging, Grid3X3, PiggyBank, Sun, WalletCards } from "lucide-react";
import { StatusCard } from "@/components/status-card";

type Period = "day" | "week" | "month";
type Summary = {
  totals: {
    solarKWh: number;
    homeKWh: number;
    batteryChargeKWh: number;
    batteryDischargeKWh: number;
    gridImportKWh: number;
    gridExportKWh: number;
    savings: number;
    coveragePct: number | null;
    sources: { solarKWh: number; batteryKWh: number; gridKWh: number };
  };
  days: Array<{ day: string; savings: number; currency: string }>;
};

const tabs: Array<[Period, string]> = [
  ["day", "يوم"],
  ["week", "أسبوع"],
  ["month", "شهر"],
];

export default function MoneyPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [tariff, setTariff] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/telemetry/summary?period=${period}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("summary unavailable");
        return (await response.json()) as Summary;
      })
      .then((value) => {
        if (!cancelled) {
          setSummary(value);
          setUnavailable(false);
          setCurrency(value.days.at(-1)?.currency ?? "USD");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const totals = summary?.totals;
  const sourceTotal = totals
    ? totals.sources.solarKWh + totals.sources.batteryKWh + totals.sources.gridKWh
    : 0;
  const solarPct = sourceTotal > 0 && totals ? (totals.sources.solarKWh / sourceTotal) * 100 : 0;
  const batteryPct = sourceTotal > 0 && totals ? (totals.sources.batteryKWh / sourceTotal) * 100 : 0;
  const gridPct = sourceTotal > 0 && totals ? (totals.sources.gridKWh / sourceTotal) * 100 : 0;
  const gridCost = totals ? totals.gridImportKWh * tariff : null;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold text-violet-600">المال</p>
        <h1 className="mt-1 text-2xl font-extrabold">المال والتوفير</h1>
        <p className="mt-1 text-sm text-slate-500">
          الحسابات تعتمد على سجلات الطاقة الفعلية المخزنة، ولا يتم تحويل يوم واحد إلى أسبوع أو شهر.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200 p-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={"rounded-xl py-2 text-sm font-bold transition " + (period === key ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white")}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">جارٍ تحميل السجلات المالية…</div>}
      {unavailable && !loading && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          لا توجد قاعدة بيانات أو سجلات تاريخية متاحة حاليًا. لن يتم عرض أرقام مالية تجريبية على أنها حقيقية.
        </div>
      )}

      {totals && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard label="التغطية" value={totals.coveragePct == null ? "—" : totals.coveragePct} unit={totals.coveragePct == null ? undefined : "%"} icon={<WalletCards size={18} />} tone="blue" />
            <StatusCard label="إنتاج الشمس" value={totals.solarKWh.toFixed(1)} unit="kWh" icon={<Sun size={18} />} tone="amber" />
            <StatusCard label="استهلاك المنزل" value={totals.homeKWh.toFixed(1)} unit="kWh" icon={<BatteryCharging size={18} />} tone="green" />
            <StatusCard label="سحب الشبكة" value={totals.gridImportKWh.toFixed(1)} unit="kWh" icon={<Grid3X3 size={18} />} tone="violet" />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black">من أين تأتي كهرباء منزلك؟</h2>
                <p className="mt-1 text-sm text-slate-500">النسب محسوبة من الطاقة التي غطت استهلاك المنزل خلال الفترة المحددة.</p>
              </div>
              {totals.coveragePct != null && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">تغطية {totals.coveragePct}%</span>}
            </div>

            <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-amber-500" style={{ width: `${solarPct}%` }} />
              <div className="bg-emerald-500" style={{ width: `${batteryPct}%` }} />
              <div className="bg-violet-500" style={{ width: `${gridPct}%` }} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SourceRow color="bg-amber-500" label="من الشمس" value={totals.sources.solarKWh.toFixed(1) + " kWh"} percent={Math.round(solarPct) + "%"} />
              <SourceRow color="bg-emerald-500" label="من البطارية" value={totals.sources.batteryKWh.toFixed(1) + " kWh"} percent={Math.round(batteryPct) + "%"} />
              <SourceRow color="bg-violet-500" label="من الشبكة" value={totals.sources.gridKWh.toFixed(1) + " kWh"} percent={Math.round(gridPct) + "%"} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PiggyBank className="text-emerald-600" size={21} />
              <h2 className="font-black">المال والتوفير</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              التوفير المحسوب من السجلات: <strong>{totals.savings.toFixed(2)} {currency}</strong>.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                <span className="text-xs font-bold">وفرت بنظامك</span>
                <strong className="mt-2 block text-2xl font-black">{totals.savings.toFixed(2)} {currency}</strong>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4 text-orange-950">
                <span className="text-xs font-bold">دفعت للشبكة</span>
                <strong className="mt-2 block text-2xl font-black">{gridCost == null ? "—" : `${gridCost.toFixed(2)} ${currency}`}</strong>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                العملة
                <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3" />
              </label>
              <label className="text-sm font-semibold text-slate-600">
                تعرفة الشبكة / kWh
                <input type="number" min="0" step="0.001" value={tariff} onChange={(e) => setTariff(Number(e.target.value) || 0)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3" />
              </label>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SourceRow({ color, label, value, percent }: { color: string; label: string; value: string; percent: string }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-center gap-2">
        <span className={"h-3 w-3 rounded-full " + color} />
        <span className="text-sm font-bold">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <strong>{percent}</strong>
        <span className="text-xs text-slate-500">{value}</span>
      </div>
    </div>
  );
}
