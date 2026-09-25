"use client";
import { useEffect, useState } from "react";
import { BatteryCharging, Sun, Home, Network, RefreshCw, WifiOff, Gauge, Zap } from "lucide-react";
import { StatusCard } from "@/components/status-card";
import { Section } from "@/components/section";
import { EnergyFlow } from "@/components/energy-flow";
import { getEnergyAdapter } from "@/lib/data-adapter";
import { batteryState, batteryStateLabel, EnergySnapshot } from "@/lib/energy";

export default function DashboardPage() {
  const [data, setData] = useState<EnergySnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      setData(await getEnergyAdapter().getSnapshot());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const bs = data ? batteryState(data.batteryPowerW) : "idle";
  const age = data ? Math.max(0, Math.round((Date.now() - new Date(data.timestamp).getTime()) / 60000)) : 0;

  return <div className="space-y-4 sm:space-y-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-bold text-blue-600">شمسك الخاص</p><h1 className="mt-1 text-2xl font-extrabold">حالة الطاقة الآن</h1><p className="mt-1 text-sm text-slate-500">تدفق الطاقة بين الشمس والمنزل والبطارية والشبكة.</p></div>
      <button onClick={load} disabled={refreshing} aria-label="تحديث البيانات" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold shadow-sm"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""}/> تحديث</button>
    </div>
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">تعذر تحميل البيانات. ستبقى آخر قراءة صالحة إن وجدت.</div>}
    {!data && !error && <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">جارٍ تحميل قراءة الطاقة…</div>}
    {data && <>
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{data.source === "demo" ? "Demo — بيانات تجريبية" : "Live — بيانات حية"}</span><span className="text-xs text-slate-500">آخر تحديث منذ {age} دقيقة</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard label="إنتاج الشمس" value={(data.solarPowerW / 1000).toFixed(2)} unit="kW" icon={<Sun size={18}/>} tone="amber"/>
        <StatusCard label="استهلاك المنزل" value={(data.homePowerW / 1000).toFixed(2)} unit="kW" icon={<Home size={18}/>} tone="blue"/>
        <StatusCard label="البطارية" value={data.batterySoc} unit={`% — ${batteryStateLabel(bs)}`} icon={<BatteryCharging size={18}/>} tone="green"/>
        <StatusCard label="الشبكة" value={data.gridConnected ? "متصلة" : "مفصولة"} icon={data.gridConnected ? <Network size={18}/> : <WifiOff size={18}/>} tone={data.gridConnected ? "violet" : "red"}/>
      </div>
      <Section title="تدفق الطاقة" subtitle="الاتجاهات تتغير حسب القراءة الحالية"><EnergyFlow data={data}/></Section>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusCard label="جهد البطارية" value={data.batteryVoltage?.toFixed(1) ?? "—"} unit="V" icon={<Gauge size={18}/>} tone="blue"/>
        <StatusCard label="قدرة البطارية" value={(Math.abs(data.batteryPowerW) / 1000).toFixed(2)} unit={`kW — ${batteryStateLabel(bs)}`} icon={<Zap size={18}/>} tone="green"/>
        <StatusCard label="الشبكة" value={(Math.abs(data.gridPowerW) / 1000).toFixed(2)} unit={data.gridPowerW < -50 ? "kW — تصدير" : "kW — سحب/توازن"} icon={<Network size={18}/>} tone="violet"/>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><strong>مصدر البيانات:</strong> {data.source === "demo" ? "لا يوجد جهاز طاقة متصل حاليًا؛ هذه قراءة Demo موسومة بوضوح." : "مصدر طاقة حي متصل."}</div>
    </>}
  </div>;
}
