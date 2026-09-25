"use client";
import { useEffect, useState } from "react";
import { MapPin, Save, LocateFixed } from "lucide-react";
import { SolarConnection } from "@/components/solar-connection";

type Settings = {
  homeName:string; location:string; latitude:number; longitude:number; timezone:string;
  currency:string; tariff:number; exportTariff:number; panelKw:number; batteryKwh:number;
  minSoc:number; maxSoc:number; refreshMinutes:number; alerts:boolean;
};

const defaults:Settings={homeName:"منزلي",location:"بيروت، لبنان",latitude:33.8938,longitude:35.5018,timezone:"Asia/Beirut",currency:"USD",tariff:0.2,exportTariff:0,panelKw:6,batteryKwh:10,minSoc:20,maxSoc:100,refreshMinutes:5,alerts:true};

export default function SettingsPage(){
 const [s,setS]=useState<Settings>(defaults);
 const [saved,setSaved]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem("shamsak-settings");if(raw)setS({...defaults,...JSON.parse(raw)})}catch{}},[]);
 const set=(key:keyof Settings,value:string|number|boolean)=>setS(x=>({...x,[key]:value}));
 const save=(e:React.FormEvent)=>{e.preventDefault();localStorage.setItem("shamsak-settings",JSON.stringify(s));setSaved(true);setTimeout(()=>setSaved(false),2000)};
 const locate=()=>{if(!navigator.geolocation)return; navigator.geolocation.getCurrentPosition(p=>setS(x=>({...x,latitude:Number(p.coords.latitude.toFixed(5)),longitude:Number(p.coords.longitude.toFixed(5)),location:"الموقع الحالي"})),()=>{})};
 return <div className="space-y-5">
  <div><p className="text-xs font-bold text-blue-600">الإعدادات</p><h1 className="mt-1 text-2xl font-extrabold">إعدادات النظام</h1><p className="mt-1 text-sm text-slate-500">هذه النسخة تحفظ الإعدادات محليًا على الجهاز؛ لا تُرسل أسرارًا إلى الخادم.</p></div>
  <SolarConnection />
  <form onSubmit={save} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
  {([["homeName","اسم المنزل","text"],["location","الموقع","text"],["currency","العملة","text"]] as const).map(([key,label,type])=><label key={key} className="space-y-1 text-sm"><span>{label}</span><input className="w-full rounded-xl border border-slate-200 p-3" type={type} value={String(s[key])} onChange={e=>set(key,e.target.value)}/></label>)}
  <label className="space-y-1 text-sm"><span>المنطقة الزمنية</span><input className="w-full rounded-xl border border-slate-200 p-3" value={s.timezone} onChange={e=>set("timezone",e.target.value)}/></label>
  <label className="space-y-1 text-sm"><span>تعرفة الكهرباء / kWh</span><input className="w-full rounded-xl border border-slate-200 p-3" inputMode="decimal" type="number" min="0" step="0.001" value={s.tariff} onChange={e=>set("tariff",Number(e.target.value))}/></label>
  <label className="space-y-1 text-sm"><span>تعرفة التصدير / kWh</span><input className="w-full rounded-xl border border-slate-200 p-3" inputMode="decimal" type="number" min="0" step="0.001" value={s.exportTariff} onChange={e=>set("exportTariff",Number(e.target.value))}/></label>
  <label className="space-y-1 text-sm"><span>قدرة الألواح kW</span><input className="w-full rounded-xl border border-slate-200 p-3" type="number" min="0.1" step="0.1" value={s.panelKw} onChange={e=>set("panelKw",Number(e.target.value))}/></label>
  <label className="space-y-1 text-sm"><span>سعة البطارية kWh</span><input className="w-full rounded-xl border border-slate-200 p-3" type="number" min="0.1" step="0.1" value={s.batteryKwh} onChange={e=>set("batteryKwh",Number(e.target.value))}/></label>
  <label className="space-y-1 text-sm"><span>الحد الأدنى %</span><input className="w-full rounded-xl border border-slate-200 p-3" type="number" min="0" max="100" value={s.minSoc} onChange={e=>set("minSoc",Number(e.target.value))}/></label>
  <label className="space-y-1 text-sm"><span>الحد الأعلى %</span><input className="w-full rounded-xl border border-slate-200 p-3" type="number" min="0" max="100" value={s.maxSoc} onChange={e=>set("maxSoc",Number(e.target.value))}/></label>
  <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2"><div className="grid gap-3 sm:grid-cols-3"><div><span className="text-xs text-slate-500">خط العرض</span><strong className="block">{s.latitude}</strong></div><div><span className="text-xs text-slate-500">خط الطول</span><strong className="block">{s.longitude}</strong></div><div className="flex items-end"><button type="button" onClick={locate} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"><LocateFixed size={16}/> استخدام موقعي الحالي</button></div></div></div>
  <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>تفعيل التنبيهات</span><input type="checkbox" checked={s.alerts} onChange={e=>set("alerts",e.target.checked)}/></label>
  <label className="space-y-1 text-sm"><span>فترة التحديث بالدقائق</span><input className="w-full rounded-xl border border-slate-200 p-3" type="number" min="1" max="60" value={s.refreshMinutes} onChange={e=>set("refreshMinutes",Number(e.target.value))}/></label>
  <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white sm:col-span-2"><Save size={17}/> حفظ الإعدادات</button>
  {saved&&<p className="text-sm font-bold text-emerald-700 sm:col-span-2">تم حفظ الإعدادات على هذا الجهاز.</p>}
  </form>
 </div>;
}
