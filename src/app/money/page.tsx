"use client";
import { useMemo, useState } from "react";
import { BatteryCharging, Grid3X3, PiggyBank, Sun, WalletCards } from "lucide-react";
import { demoSnapshot, energyBalance } from "@/lib/energy";
import { StatusCard } from "@/components/status-card";

type Period = "day"|"week"|"month";
const tabs: Array<[Period,string]> = [["day","يوم"],["week","أسبوع"],["month","شهر"]];

export default function MoneyPage(){
 const [period,setPeriod]=useState<Period>("month");
 const [currency,setCurrency]=useState("USD");
 const [tariff,setTariff]=useState(0.2);
 const balance=useMemo(()=>energyBalance(demoSnapshot),[]);
 const hasDaily=demoSnapshot.todayProductionKWh!=null || demoSnapshot.todayHomeUsageKWh!=null || demoSnapshot.todayGridSavings!=null;
 const solar=demoSnapshot.todayProductionKWh; const usage=demoSnapshot.todayHomeUsageKWh; const savings=demoSnapshot.todayGridSavings;
 const grid=usage!=null&&solar!=null?Math.max(0,usage-solar):undefined;
 const coverage=usage&&usage>0&&solar!=null?Math.min(100,Math.round(solar/usage*100)):undefined;
 const solarPct=usage&&usage>0&&solar!=null?Math.min(100,solar/usage*100):0; const gridPct=usage&&usage>0&&grid!=null?Math.min(100,grid/usage*100):0; const batteryPct=0;
 const gridCost=grid!=null?grid*tariff:undefined;
 return <div className="space-y-5">
  <header><p className="text-xs font-bold text-violet-600">المال</p><h1 className="mt-1 text-2xl font-extrabold">المال والتوفير</h1><p className="mt-1 text-sm text-slate-500">التكاليف تعتمد على القراءات اليومية والتعرفة التي تحددها من الإعدادات.</p></header>
  <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200 p-1">{tabs.map(([key,label])=><button key={key} type="button" onClick={()=>setPeriod(key)} className={"rounded-xl py-2 text-sm font-bold transition "+(period===key?"bg-slate-900 text-white shadow-sm":"text-slate-600 hover:bg-white")}>{label}</button>)}</div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatusCard label="التغطية" value={coverage==null?"—":coverage} unit={coverage==null?undefined:"%"} icon={<WalletCards size={18}/>} tone="blue"/><StatusCard label="إنتاج الشمس" value={solar==null?"—":solar.toFixed(1)} unit={solar==null?undefined:"kWh"} icon={<Sun size={18}/>} tone="amber"/><StatusCard label="استهلاك المنزل" value={usage==null?"—":usage.toFixed(1)} unit={usage==null?undefined:"kWh"} icon={<BatteryCharging size={18}/>} tone="green"/><StatusCard label="الشبكة" value={grid==null?"—":grid.toFixed(1)} unit={grid==null?undefined:"kWh"} icon={<Grid3X3 size={18}/>} tone="violet"/></div>
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">من أين تأتي كهرباء منزلك؟</h2><p className="mt-1 text-sm text-slate-500">{hasDaily?"النسب مبنية على بيانات الطاقة اليومية المتاحة.":"لا تتوفر قراءات يومية كافية لحساب النسب حاليًا."}</p></div>{coverage!=null&&<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">تغطية {coverage}%</span>}</div>
   <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-100"><div className="bg-amber-500" style={{width:solarPct+"%"}}/><div className="bg-emerald-500" style={{width:batteryPct+"%"}}/><div className="bg-violet-500" style={{width:gridPct+"%"}}/></div>
   <div className="mt-5 grid gap-3 sm:grid-cols-3"><SourceRow color="bg-amber-500" label="من الشمس" value={solar==null?"—":solar.toFixed(1)+" kWh"} percent={solar==null?"—":Math.round(solarPct)+"%"}/><SourceRow color="bg-emerald-500" label="من البطارية" value="—" percent="—"/><SourceRow color="bg-violet-500" label="من الشبكة" value={grid==null?"—":grid.toFixed(1)+" kWh"} percent={grid==null?"—":Math.round(gridPct)+"%"}/></div>
  </section>
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><PiggyBank className="text-emerald-600" size={21}/><h2 className="font-black">المال والتوفير</h2></div>
   <p className="mt-3 text-sm leading-6 text-slate-600">{savings!=null?"التوفير المسجل في مصدر البيانات: "+savings.toFixed(2)+" "+currency+".":"لا توجد قيمة توفير موثقة في بيانات النظام الحالية، لذلك لن نخترع رقمًا."}</p>
   <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900"><span className="text-xs font-bold">وفرت بنظامك</span><strong className="mt-2 block text-2xl font-black">{savings==null?"—":savings.toFixed(2)+" "+currency}</strong></div><div className="rounded-2xl bg-orange-50 p-4 text-orange-950"><span className="text-xs font-bold">دفعت للشبكة</span><strong className="mt-2 block text-2xl font-black">{gridCost==null?"—":gridCost.toFixed(2)+" "+currency}</strong></div></div>
   <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-600">العملة<input value={currency} onChange={e=>setCurrency(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3"/></label><label className="text-sm font-semibold text-slate-600">تعرفة الشبكة / kWh<input type="number" min="0" step="0.001" value={tariff} onChange={e=>setTariff(Number(e.target.value)||0)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3"/></label></div>
   <p className="mt-3 text-xs text-slate-500">ملاحظة: الطاقة اللحظية الحالية هي Demo، ولا تُستخدم هنا كأنها طاقة شهرية. ربط البيانات اليومية الحقيقية مطلوب لحساب فاتورة دقيقة.</p>
  </section>
 </div>;
}

function SourceRow({color,label,value,percent}:{color:string;label:string;value:string;percent:string}){return <div className="rounded-xl border border-slate-100 p-3"><div className="flex items-center gap-2"><span className={"h-3 w-3 rounded-full "+color}/><span className="text-sm font-bold">{label}</span></div><div className="mt-2 flex items-baseline justify-between gap-2"><strong>{percent}</strong><span className="text-xs text-slate-500">{value}</span></div></div>}