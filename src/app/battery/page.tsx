"use client";
import { useEffect, useState } from "react";
import { BatteryCharging, Thermometer, Zap, Gauge, RotateCcw } from "lucide-react";
import { StatusCard } from "@/components/status-card";
import { HourlyChart } from "@/components/hourly-chart";
import { getEnergyAdapter } from "@/lib/data-adapter";
import { EnergySnapshot, batteryStateLabel } from "@/lib/energy";

export default function BatteryPage(){
 const [data,setData]=useState<EnergySnapshot|null>(null);
 useEffect(()=>{getEnergyAdapter().getSnapshot().then(setData)},[]);
 const values=[72,75,78,81,84,82,79,76,74,77,80,83];
 return <div className="space-y-4"><div><p className="text-xs font-bold text-emerald-600">البطارية</p><h1 className="mt-1 text-2xl font-extrabold">حالة البطارية</h1><p className="mt-1 text-sm text-slate-500">البيانات التجريبية موسومة بوضوح إلى حين ربط BMS/العاكس.</p></div>
 {data ? <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatusCard label="نسبة الشحن" value={data.batterySoc} unit="%" icon={<BatteryCharging size={18}/>} tone="green"/><StatusCard label="الحالة" value={batteryStateLabel(data.batteryPowerW>50?"charging":data.batteryPowerW<-50?"discharging":"idle")} icon={<Zap size={18}/>} tone="green"/><StatusCard label="الجهد" value={data.batteryVoltage?.toFixed(1)??"—"} unit="V" icon={<Gauge size={18}/>} tone="blue"/><StatusCard label="الحرارة" value={data.batteryTemperature?.toFixed(0)??"—"} unit="°C" icon={<Thermometer size={18}/>} tone="amber"/></div>
 <div className="grid gap-3 sm:grid-cols-3"><StatusCard label="التيار" value={data.batteryCurrent?.toFixed(0)??"—"} unit="A" icon={<Zap size={18}/>} tone="blue"/><StatusCard label="قدرة الشحن/التفريغ" value={(Math.abs(data.batteryPowerW)/1000).toFixed(2)} unit="kW" icon={<Zap size={18}/>} tone="green"/><StatusCard label="الدورات" value="غير متاحة" icon={<RotateCcw size={18}/>} tone="violet"/></div>
 <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">مستوى البطارية خلال اليوم</h2><p className="mb-4 mt-1 text-xs text-slate-500">مخطط Demo توضيحي وليس سجل BMS حقيقي.</p><HourlyChart values={values}/></div>
 <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">إعدادات التشغيل</h2><div className="mt-3 space-y-2 text-sm text-slate-600"><p>الحد الأدنى للتفريغ: 20%</p><p>الحد الأعلى للشحن: 100%</p><p>الوضع: شحن من الشمس فقط</p></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">الصحة</h2><p className="mt-3 text-2xl font-extrabold text-emerald-600">غير متاحة</p><p className="text-xs text-slate-500">تحتاج قراءة BMS حقيقية لعرض الصحة والدورات.</p></div></div></> : <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">جارٍ تحميل البطارية…</div>}
 </div>;
}
