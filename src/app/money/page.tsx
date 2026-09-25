"use client";
import { useState } from "react";
import { WalletCards, Sun, BatteryCharging, Grid3X3, PiggyBank } from "lucide-react";
import { StatusCard } from "@/components/status-card";
import { energyBalance, demoSnapshot } from "@/lib/energy";

export default function MoneyPage(){
 const [period,setPeriod]=useState<"day"|"week"|"month">("day");
 const tabs=[["day","يوم"],["week","أسبوع"],["month","شهر"]] as const;
 const b=energyBalance(demoSnapshot);
 const solar=Math.max(0,b.solar*8), battery=Math.max(0,b.batteryDischarge*3), grid=Math.max(0,b.gridImport*8);
 const total=solar+battery+grid; const coverage=total?Math.round(((solar+battery)/total)*100):0;
 return <div className="space-y-4"><div><p className="text-xs font-bold text-violet-600">المال</p><h1 className="mt-1 text-2xl font-extrabold">التكلفة والتوفير</h1><p className="mt-1 text-sm text-slate-500">الحسابات قابلة للتوصيل بقراءات حقيقية وتعرفة من الإعدادات.</p></div>
 <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200 p-1">{tabs.map(([key,label])=><button key={key} onClick={()=>setPeriod(key)} className={`rounded-xl py-2 text-sm font-bold ${period===key?"bg-white text-slate-900 shadow-sm":"text-slate-600"}`}>{label}</button>)}</div>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatusCard label="التغطية" value={coverage} unit="%" icon={<WalletCards size={18}/>} tone="blue"/><StatusCard label="من الشمس" value={solar.toFixed(1)} unit="kWh" icon={<Sun size={18}/>} tone="amber"/><StatusCard label="من البطارية" value={battery.toFixed(1)} unit="kWh" icon={<BatteryCharging size={18}/>} tone="green"/><StatusCard label="من الشبكة" value={grid.toFixed(1)} unit="kWh" icon={<Grid3X3 size={18}/>} tone="violet"/></div>
 <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">التوفير</h2><p className="mt-2 text-sm text-slate-500">الأرقام الحالية تعتمد على Demo ولا تمثل فاتورة حقيقية. أدخل التعرفة والعملة في الإعدادات، ثم اربط مصدر قراءات الطاقة.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">التعرفة</span><strong className="mt-1 block">من الإعدادات</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">الفترة</span><strong className="mt-1 block">{tabs.find(t=>t[0]===period)?.[1]}</strong></div><div className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><PiggyBank size={18}/><strong className="mt-1 block">لا يوجد ادعاء بتوفير حقيقي</strong></div></div></div>
 </div>;
}
