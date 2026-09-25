"use client";
import { useEffect, useState } from "react";
import { House, PlugZap, Gauge } from "lucide-react";
import { StatusCard } from "@/components/status-card";
import { getEnergyAdapter } from "@/lib/data-adapter";
import { EnergySnapshot } from "@/lib/energy";

export default function HomePage() {
 const [data,setData]=useState<EnergySnapshot|null>(null);
 useEffect(()=>{getEnergyAdapter().getSnapshot().then(setData)},[]);
 return <div className="space-y-4"><div><p className="text-xs font-bold text-blue-600">المنزل</p><h1 className="mt-1 text-2xl font-extrabold">استهلاك المنزل</h1><p className="mt-1 text-sm text-slate-500">قراءة المنزل والشبكة من طبقة البيانات الحالية.</p></div>
 {data ? <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><StatusCard label="الاستهلاك الآن" value={(data.homePowerW/1000).toFixed(2)} unit="kW" icon={<House size={18}/>} tone="blue"/><StatusCard label="الشبكة" value={data.gridConnected?"متصلة":"مفصولة"} icon={<PlugZap size={18}/>} tone={data.gridConnected?"violet":"red"}/><StatusCard label="السحب/التصدير" value={(Math.abs(data.gridPowerW)/1000).toFixed(2)} unit={data.gridPowerW<0?"kW تصدير":"kW سحب"} icon={<Gauge size={18}/>} tone="green"/></div>
 <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">حالة المصدر</h2><p className="mt-2 text-sm text-slate-500">{data.source==="demo"?"Demo — لا يوجد عداد منزل حي متصل حاليًا.":"Live — القراءة واردة من مصدر حي."}</p></div></> : <div className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">جارٍ تحميل البيانات…</div>}
 </div>;
}
