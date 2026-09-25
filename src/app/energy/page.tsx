"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BatteryCharging, CheckCircle2, CloudSun, RefreshCw, Sun, Sunrise, Sunset, WashingMachine, Zap } from "lucide-react";
import { Section } from "@/components/section";
import { buildHourlyForecast } from "@/lib/forecast";
import { demoSnapshot, type EnergySnapshot } from "@/lib/energy";
import { estimateBatteryNight } from "@/lib/predictive";

type Weather = {
  source?: string;
  daily: {
    time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[];
    sunrise: string[]; sunset: string[]; precipitation_probability_max: number[];
  };
  hourly: { time: string[]; shortwave_radiation: number[]; cloud_cover: number[]; temperature_2m: number[] };
};

const names: Record<number,string> = {0:"صحو",1:"غائم جزئيًا",2:"غيوم متفرقة",3:"غائم",45:"ضباب",48:"ضباب",51:"رذاذ",53:"رذاذ",61:"مطر",63:"مطر",65:"مطر غزير",71:"ثلج",73:"ثلج",75:"ثلج غزير",80:"زخات",81:"زخات",82:"زخات قوية",95:"عواصف"};
const timeLabel = (v?: string) => v ? new Date(v).toLocaleTimeString("ar-LB",{hour:"2-digit",minute:"2-digit"}) : "—";

export default function EnergyPage() {
  const [weather,setWeather] = useState<Weather|null>(null);
  const [snapshot,setSnapshot] = useState<EnergySnapshot|null>(null);
  const [error,setError] = useState(false);
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState(0);
  const [panelKw,setPanelKw] = useState(6);

  const load = async () => {
    setLoading(true);
    try {
      const [weatherResponse, telemetryResponse] = await Promise.all([
        fetch("/api/weather",{cache:"no-store"}),
        fetch("/api/telemetry",{cache:"no-store"}),
      ]);
      if (!weatherResponse.ok) throw new Error("weather");
      const weatherData = await weatherResponse.json() as Weather;
      setWeather(weatherData);
      if (telemetryResponse.ok) setSnapshot({...await telemetryResponse.json() as EnergySnapshot, source:"live"});
      else setSnapshot({...demoSnapshot, source:"demo"});
      setError(false);
    } catch {
      setError(true);
      setSnapshot({...demoSnapshot, source:"demo"});
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const days = weather?.daily;
  const hourly = weather?.hourly;
  const current = snapshot ?? demoSnapshot;
  const forecast = useMemo(
    () => hourly ? buildHourlyForecast(hourly.time,hourly.shortwave_radiation,panelKw,current.batterySoc,10) : [],
    [hourly,panelKw,current.batterySoc],
  );
  const selectedDay = days?.time[selected];
  const dayHours = forecast.filter(x => selectedDay && new Date(x.time).toISOString().slice(0,10) === selectedDay);
  const solarTotal = dayHours.reduce((s,x)=>s+x.solarKwh,0);
  const batteryTotal = dayHours.reduce((s,x)=>s+x.batteryChargeKwh,0);
  const surplusTotal = dayHours.reduce((s,x)=>s+x.surplusKwh,0);
  const base = Math.max(solarTotal,0.001);
  const batteryPct = Math.min(100,Math.round(batteryTotal/base*100));
  const surplusPct = Math.min(100-batteryPct,Math.round(surplusTotal/base*100));
  const homePct = Math.max(0,100-batteryPct-surplusPct);
  const night = estimateBatteryNight(current,10,8,20);

  return <div className="space-y-5">
    <header><p className="text-xs font-bold text-amber-600">الطاقة</p><h1 className="mt-1 text-2xl font-extrabold">الطاقة والتوقعات</h1><p className="mt-1 text-sm text-slate-500">التوقعات تستخدم الطقس والقراءة الحالية، وتوضح بوضوح إذا كانت القراءة Demo.</p></header>
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">الطقس: {weather?.source ?? "—"}</span>
      <span className={"rounded-full px-3 py-1 text-xs font-bold "+(current.source==="live"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700")}>{current.source==="live"?"LIVE":"DEMO"}</span>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">قدرة الألواح
        <input aria-label="قدرة الألواح بالكيلوواط" type="number" min="0.1" max="100" step="0.1" value={panelKw} onChange={e=>setPanelKw(Number(e.target.value)||6)} className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5"/>kW
      </label>
      <button type="button" onClick={()=>void load()} disabled={loading} className="ms-auto rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm" aria-label="تحديث التوقعات"><RefreshCw size={18} className={loading?"animate-spin":""}/></button>
    </div>
    {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle className="me-2 inline" size={18}/> تعذر تحميل أحد مصادر البيانات؛ تم الحفاظ على آخر قراءة/وضع Demo.</div>}
    {loading && <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">جارٍ تحميل الطقس وقراءة الطاقة…</div>}
    {days && <>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="اختيار يوم التوقع">
        {days.time.slice(0,7).map((day,i)=><button type="button" key={day} onClick={()=>setSelected(i)} className={"min-w-[150px] shrink-0 rounded-2xl border p-4 text-right transition "+(selected===i?"border-blue-500 bg-blue-50 shadow-sm":"border-slate-200 bg-white hover:border-blue-200")}>
          <div className="text-xs font-bold text-slate-500">{i===0?"اليوم":i===1?"غدًا":i===2?"بعد غد":new Date(day).toLocaleDateString("ar-LB",{weekday:"long"})}</div>
          <div className="mt-2 flex items-center gap-2"><CloudSun size={20} className="text-amber-500"/><strong>{names[days.weather_code[i]]??"حالة جوية"}</strong></div>
          <div className="mt-2 text-sm font-bold">{Math.round(days.temperature_2m_max[i])}° / {Math.round(days.temperature_2m_min[i])}°</div>
          <div className="mt-1 text-xs text-slate-500">مطر {days.precipitation_probability_max[i]}%</div>
        </button>)}
      </div>
      <Section title="توقع التوليد" subtitle={current.source==="live"?"يعتمد على قراءة البطارية الحية وقدرة الألواح المدخلة.":"لا يوجد اتصال حي؛ القراءة الحالية Demo وموسومة بوضوح."}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric icon={<Sun className="text-amber-600" size={20}/>} label="إنتاج متوقع" value={solarTotal.toFixed(1)+" kWh"} tone="bg-amber-50"/>
          <Metric icon={<BatteryCharging className="text-emerald-600" size={20}/>} label="إلى البطارية" value={batteryTotal.toFixed(1)+" kWh"} tone="bg-emerald-50"/>
          <Metric icon={<Zap className="text-orange-600" size={20}/>} label="فائض متوقع" value={surplusTotal.toFixed(1)+" kWh"} tone="bg-orange-50"/>
        </div>
        <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100"><div className="bg-emerald-500" style={{width:batteryPct+"%"}}/><div className="bg-blue-500" style={{width:homePct+"%"}}/><div className="bg-orange-400" style={{width:surplusPct+"%"}}/></div>
        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3"><span>البطارية {batteryPct}%</span><span>المنزل {homePct}%</span><span>الفائض {surplusPct}%</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><Info icon={<Sunrise size={17}/>} label="الشروق" value={timeLabel(days.sunrise[selected])}/><Info icon={<BatteryCharging size={17}/>} label="امتلاء البطارية" value="—"/><Info icon={<Sunset size={17}/>} label="الغروب" value={timeLabel(days.sunset[selected])}/></div>
      </Section>
      <Section title="صمود البطارية لليل"><div className={"rounded-2xl border p-5 "+(night.enough?"border-emerald-200 bg-emerald-50":"border-orange-200 bg-orange-50")}><div className="flex items-start gap-3"><div className="rounded-full bg-white p-2 text-emerald-600">{night.enough?<CheckCircle2 size={20}/>:<AlertTriangle size={20}/>}</div><div><h2 className="font-black">{night.enough?"تكفي حتى الصباح":"قد لا تكفي حتى الصباح"}</h2><p className="mt-1 text-sm text-slate-600">احتمال الصمود نحو <strong>{night.probabilityPct}%</strong>، والتقدير عند الصباح نحو <strong>{night.endSocPct.toFixed(0)}%</strong> وفق سعة البطارية والاستهلاك الليلي المدخلين.</p></div></div></div></Section>
      <Section title="فائض شمسك"><div className="flex items-start gap-3 rounded-2xl bg-orange-50 p-5 text-orange-950"><WashingMachine size={22} className="mt-0.5 shrink-0 text-orange-600"/><div><h2 className="font-black">الساعات الذهبية</h2><p className="mt-1 text-sm text-orange-900/80">{surplusTotal>0?"الفائض المتوقع نحو "+surplusTotal.toFixed(1)+" kWh؛ استخدم الغسالة أو مضخة المياه خلال ساعات الإنتاج المرتفع.":"لا يوجد فائض متوقع كافٍ في البيانات الحالية."}</p></div></div></Section>
      <Section title="تفصيل الساعات"><div className="overflow-x-auto rounded-2xl border border-slate-100"><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50 text-right text-xs text-slate-500"><tr><th className="p-3">الوقت</th><th className="p-3">الشمس</th><th className="p-3">الاستهلاك</th><th className="p-3">البطارية</th><th className="p-3">الفائض</th></tr></thead><tbody>{dayHours.slice(0,24).map(x=><tr key={x.time} className="border-t border-slate-100"><td className="p-3 font-semibold">{timeLabel(x.time)}</td><td className="p-3">{x.solarKwh.toFixed(2)} kWh</td><td className="p-3">{x.expectedLoadKwh.toFixed(2)} kWh</td><td className="p-3">{x.batteryChargeKwh.toFixed(2)} kWh</td><td className="p-3 font-bold text-emerald-700">{x.surplusKwh.toFixed(2)} kWh</td></tr>)}</tbody></table></div></Section>
    </>}
  </div>;
}
function Metric({icon,label,value,tone}:{icon:React.ReactNode;label:string;value:string;tone:string}){return <div className={"rounded-2xl p-4 "+tone}>{icon}<span className="mt-3 block text-xs font-semibold text-slate-500">{label}</span><strong className="mt-1 block text-2xl font-black">{value}</strong></div>}
function Info({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="text-slate-500">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><strong className="text-sm text-slate-900">{value}</strong></div></div>}
