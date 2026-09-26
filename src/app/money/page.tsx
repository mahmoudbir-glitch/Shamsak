"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type Period = "day" | "week" | "month";
type FinanceData = {
  period: Period;
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
  coverage: { kWh: number; pct: number };
  unknown: { kWh: number; cost: number };
  financial: {
    tariff: number;
    exportTariff: number;
    actualGridCost: number;
    hypotheticalCost: number;
    avoidedCost: number;
  };
  currency: string;
};

const periods: { key: Period; label: string }[] = [
  { key: "day", label: "اليوم" },
  { key: "week", label: "الأسبوع" },
  { key: "month", label: "الشهر" },
];

export default function MoneyDashboard() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (nextPeriod = period) => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/finance?period=" + nextPeriod, { cache: "no-store" });
      if (!response.ok) throw new Error("finance_unavailable");
      setData(await response.json() as FinanceData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load("month"); }, []);

  const sourceRows = data ? [
    { name: "من الشمس", pct: data.sources.solarPct, kwh: data.sources.solarKWh, color: "bg-amber-500" },
    { name: "من البطارية", pct: data.sources.batteryPct, kwh: data.sources.batteryKWh, color: "bg-emerald-500" },
    { name: "من الشبكة", pct: data.sources.gridPct, kwh: data.sources.gridKWh, color: "bg-purple-500" },
  ] : [];

  const periodTitle = periods.find((item) => item.key === period)?.label ?? "الشهر";

  const tariff = data?.financial.tariff ?? 0;
  const currency = data?.currency || "ل.س";

  const sourceTotal = useMemo(() => sourceRows.reduce((sum, row) => sum + row.kwh, 0), [sourceRows]);

  return (
    <div className="w-full space-y-5 text-right" dir="rtl">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">💰 التحليل المالي والطاقة</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">تفكيك مصادر التغذية والتكلفة المفترضة</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={refreshing} aria-label="تحديث التحليل المالي" className="rounded-xl bg-blue-50 p-3 text-blue-700 disabled:opacity-50">
            {refreshing ? <Loader2 className="animate-spin" size={19} /> : <RefreshCw size={19} />}
          </button>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {periods.map((item) => (
            <button key={item.key} type="button" onClick={() => { setPeriod(item.key); void load(item.key); }} className={"min-w-24 rounded-xl px-4 py-2.5 text-sm font-black transition " + (period === item.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600")}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">⚡ مصادر الكهرباء الداخلة للمنزل</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">الفترة: {periodTitle}</p>
        {loading ? <p className="mt-4 text-base font-bold text-slate-500">جاري تحميل التحليل…</p> : !data ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-base font-semibold text-slate-600">لا توجد ملخصات طاقة مسجلة لهذه الفترة.</p>
        ) : (
          <>
            <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100">
              {sourceRows.map((row) => <div key={row.name} className={row.color} style={{ width: row.pct + "%" }} />)}
            </div>
            <div className="mt-5 space-y-3">
              {sourceRows.map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3"><span className={"h-4 w-4 rounded-full " + row.color} /><span className="text-base font-semibold text-slate-700">{row.name}</span></div>
                  <strong className="text-base font-extrabold text-slate-900">{row.pct}% • {row.kwh.toFixed(1)} ك.و.س</strong>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-black text-blue-800">تغطية المنظومة</span>
                <strong className="text-2xl font-black text-blue-700">{data.coverage.pct}%</strong>
              </div>
              <p className="mt-1 text-sm font-semibold text-blue-700/80">الشمس + البطارية غطّتا نحو {data.coverage.kWh.toFixed(1)} ك.و.س من طلب المنزل.</p>
            </div>
            {sourceTotal > 0 && data.unknown.kWh > 0.05 && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between"><span className="font-black text-amber-800">طاقة مجهولة المصدر</span><strong className="text-lg font-black text-amber-700">{data.unknown.kWh.toFixed(1)} ك.و.س</strong></div>
                <p className="mt-1 text-xs font-semibold text-amber-700">فرق بين استهلاك المنزل ومصادر التغذية المسجلة. لا تُحتسب كشمس أو بطارية أو شبكة.</p>
              </div>
            )}
          </>
        )}
      </section>

      {data && (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">🪙 التكلفة المفترضة</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric title="لولا نظامك الشمسي" value={data.financial.hypotheticalCost.toLocaleString() + " " + currency} tone="amber" />
            <Metric title="تكلفة الشبكة الفعلية" value={data.financial.actualGridCost.toLocaleString() + " " + currency} tone="purple" />
            <Metric title="الوفر المحسوب" value={data.financial.avoidedCost.toLocaleString() + " " + currency} tone="emerald" />
            <Metric title="قيمة الطاقة المجهولة" value={data.unknown.cost.toLocaleString() + " " + currency} tone="orange" />
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-500">«لولا نظامك الشمسي» افتراض محاسبي: كل الطاقة التي غطتها الشمس/البطارية كان سيتم شراؤها من الشبكة بالسعر المضبوط في الإعدادات.</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">سعر الشبكة المستخدم: {tariff.toLocaleString()} {currency}/ك.و.س.</p>
        </section>
      )}
    </div>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: "amber" | "purple" | "emerald" | "orange" }) {
  const cls = { amber: "bg-amber-50 text-amber-700", purple: "bg-purple-50 text-purple-700", emerald: "bg-emerald-50 text-emerald-700", orange: "bg-orange-50 text-orange-700" }[tone];
  return <div className={"rounded-xl p-4 " + cls}><span className="block text-sm font-semibold opacity-80">{title}</span><strong className="mt-1 block text-lg font-black">{value}</strong></div>;
}
