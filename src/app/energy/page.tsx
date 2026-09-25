"use client";
import { useEffect, useMemo, useState } from "react";
import { Sunrise, Sunset, CloudSun, RefreshCw, AlertTriangle, Sun, BatteryCharging, Zap } from "lucide-react";
import { Section } from "@/components/section";
import { buildHourlyForecast, batteryNightAssessment } from "@/lib/forecast";
import { demoSnapshot } from "@/lib/energy";

type Weather = {
 source?: string;
 daily: { time:string[]; weather_code:number[]; temperature_2m_max:number[]; temperature_2m_min:number[]; sunrise:string[]; sunset:string[]; precipitation_probability_max:number[]; sunshine_duration:number[]; daylight_duration:number[] };
 hourly: { time:string[]; shortwave_radiation:number[]; cloud_cover:number[]; temperature_2m:number[] };
 current?: { temperature_2m:number; cloud_cover:number; weather_code:number };
};
const names:Record<number,string>={0:"صحو",1:"غائم جزئيًا",2:"غيوم متفرقة",3:"غائم",45:"ضباب",48:"ضباب",51:"رذاذ",53:"رذاذ",61:"مطر",63:"مطر",65:"مطر غزير",71:"ثلج",73:"ثلج",75:"ثلج غزير",80:"زخات",81:"زخات",82:"زخات قوية",95:"عواصف"};

export default function EnergyPage(){
 const [weather,setWeather]=useState<Weather|null>(null);
 const [error,setError]=useState(false);
 const [loading,setLoading]=useState(true);
 const [selected,setSelected]=useState(0);
 const [panelKw,setPanelKw]=useState(6);

 const load=async()=>{
   setLoading(true);
   try {
     const r=await fetch("/api/weather",{cache:"no-store"});
     if(!r.ok) throw new Error();
     setWeather(await r.json()); setError(false);
   } catch { setError(true); }
   finally { setLoading(false); }
 };
 useEffect(()=>{load(); const id=setInterval(load,1800000); return()=>clearInterval(id)},[]);
 const days=weather?.daily;
 const hourly=weather?.hourly;
 const forecast=useMemo(()=>hourly?buildHourlyForecast(hourly.time,hourly.shortwave_radiation,panelKw,demoSnapshot.batterySoc,10):[],[hourly,panelKw]);
 const dayHours=forecast.filter((x)=>new Date(x.time).toISOString().slice(0,10)===days?.time[selected]);
 const solarTotal=dayHours.reduce((s,x)=>s+x.solarKwh,0);
 const surplusTotal=dayHours.reduce((s,x)=>s+x.surplusKwh,0);
 const nightAssessment=batteryNightAssessment(demoSnapshot.batterySoc,10,8);
 return <div className="space-y-4">
  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-amber-600">الطاقة</p><h1 className="mt-1 text-2xl font-extrabold">التوقعات والطاقة الشمسية</h1><p className="mt-1 text-sm text-slate-500">تقدير مبني على الطقس وبيانات النظام، وليس إنتاجًا فعليًا.</p></div><button onClick={load} disabled={loading} className="rounded-xl border border-slate-200 bg-white p-2.5" aria-label="تحديث الطقس"><RefreshCw size={18} className={loading?"animate-spin":""}/></button></div>
  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">المصدر: {weather?.source ?? "Open-Meteo"}</span><label className="flex items-center gap-2 text-xs text-slate-500">قدرة الألواح <input aria-label="قدرة الألواح بالكيلوواط" type="number" min="0.1" max="100" step="0.1" value={panelKw} onChange={e=>setPanelKw(Number(e.target.value)||6)} className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1"/></label></div>
  {loading&&<div className="rounded-2xl bg-white p-5 text-sm text-slate-500">جارٍ تحميل بيانات Open-Meteo…</div>}
  {error&&<div role="alert" className="flex gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={18}/>لا تتوفر بيانات الطقس حاليًا.</div>}
  {days&&<><div className="flex gap-2 overflow-x-auto pb-1">{days.time.map((day,i)=><button type="button" key={day} onClick={()=>setSelected(i)} className={`min-w-40 rounded-2xl border p-4 text-right ${selected===i?"border-blue-300 bg-blue-50":"border-slate-200 bg-white"}`}><div className="text-xs text-slate-500">{i===0?"اليوم":i===1?"غدًا":i===2?"بعد غد":day}</div><div className="mt-2 flex items-center gap-2"><CloudSun size={20}/><strong>{names[days.weather_code[i]]??"حالة جوية"}</strong></div><div className="mt-2 text-sm">{Math.round(days.temperature_2m_max[i])}° / {Math.round(days.temperature_2m_min[i])}°</div><div className="mt-2 text-xs text-slate-500">مطر {days.precipitation_probability_max[i]}%</div></button>)}</div>
  <Section title="ملخص اليوم"><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-xl bg-amber-50 p-3"><Sun size={18}/><span className="mt-2 block text-xs text-slate-500">إنتاج شمسي متوقع</span><strong>{solarTotal.toFixed(1)} kWh</strong></div><div className="rounded-xl bg-emerald-50 p-3"><BatteryCharging size={18}/><span className="mt-2 block text-xs text-slate-500">طاقة للبطارية</span><strong>{dayHours.reduce((s,x)=>s+x.batteryChargeKwh,0).toFixed(1)} kWh</strong></div><div className="rounded-xl bg-blue-50 p-3"><Zap size={18}/><span className="mt-2 block text-xs text-slate-500">فائض متوقع</span><strong>{surplusTotal.toFixed(1)} kWh</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">الشروق / الغروب</span><strong className="block">{new Date(days.sunrise[selected]).toLocaleTimeString("ar-LB",{hour:"2-digit",minute:"2-digit"})} / {new Date(days.sunset[selected]).toLocaleTimeString("ar-LB",{hour:"2-digit",minute:"2-digit"})}</strong></div></div></Section>
  <Section title="ما تبقى من اليوم حتى الغروب"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><Sunset size={17}/><span className="mt-2 block text-xs text-slate-500">الغروب</span><strong>{new Date(days.sunset[selected]).toLocaleTimeString("ar-LB",{hour:"2-digit",minute:"2-digit"})}</strong></div><div className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><span className="text-xs">كفاية البطارية حتى الصباح</span><strong className="mt-2 block">{nightAssessment.enough?"متوقعة":"غير كافية وفق الافتراض الحالي"}</strong></div><div className="rounded-xl bg-blue-50 p-3 text-blue-900"><span className="text-xs">احتمال الصمود التقديري</span><strong className="mt-2 block">{nightAssessment.probability}%</strong></div></div></Section>
  <Section title="تفصيل الساعات"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b text-right text-xs text-slate-500"><th className="p-2">الوقت</th><th className="p-2">الشمس</th><th className="p-2">الاستهلاك</th><th className="p-2">البطارية</th><th className="p-2">الفائض</th></tr></thead><tbody>{dayHours.slice(0,24).map(x=><tr key={x.time} className="border-b last:border-0"><td className="p-2">{new Date(x.time).toLocaleTimeString("ar-LB",{hour:"2-digit"})}</td><td className="p-2">{x.solarKwh.toFixed(2)} kWh</td><td className="p-2">{x.expectedLoadKwh.toFixed(2)}</td><td className="p-2">{x.batteryChargeKwh.toFixed(2)}</td><td className="p-2 font-bold text-emerald-700">{x.surplusKwh.toFixed(2)}</td></tr>)}</tbody></table></div></Section>
  </>}
 </div>;
}
