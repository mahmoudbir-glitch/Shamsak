'use client';
import {useEffect,useState} from 'react';
import {BatteryCharging,Sun,Home,Network,RefreshCw,WifiOff} from 'lucide-react';
import {StatusCard} from '@/components/status-card';
import {Section} from '@/components/section';
import {EnergyFlow} from '@/components/energy-flow';
import {demoSnapshot,EnergySnapshot,batteryState} from '@/lib/energy';

export default function DashboardPage(){
 const [data,setData]=useState<EnergySnapshot>(demoSnapshot);
 const [updated,setUpdated]=useState(demoSnapshot.timestamp);
 const [refreshing,setRefreshing]=useState(false);
 useEffect(()=>{const id=setInterval(()=>setUpdated(new Date().toISOString()),30000);return()=>clearInterval(id)},[]);
 function refresh(){setRefreshing(true);setTimeout(()=>{setUpdated(new Date().toISOString());setRefreshing(false)},400)}
 const age=Math.max(0,Math.round((Date.now()-new Date(updated).getTime())/60000));
 const bs=batteryState(data.batteryPowerW);
 return <div className="space-y-4 sm:space-y-5">
  <div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-extrabold">لوحة الطاقة</h1><p className="mt-1 text-sm text-slate-500">مراقبة الحالة الحالية للنظام المنزلي.</p></div><button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold shadow-sm" disabled={refreshing}><RefreshCw size={16} className={refreshing?'animate-spin':''}/> تحديث</button></div>
  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Demo — بيانات تجريبية</span><span className="text-xs text-slate-500">آخر تحديث منذ {age} دقيقة</span></div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   <StatusCard label="إنتاج الشمس" value={(data.solarPowerW/1000).toFixed(2)} unit="kW" icon={<Sun size={18}/>} tone="amber"/>
   <StatusCard label="استهلاك المنزل" value={(data.homePowerW/1000).toFixed(2)} unit="kW" icon={<Home size={18}/>} tone="blue"/>
   <StatusCard label="البطارية" value={data.batterySoc} unit={bs==='charging'?'% — تشحن':bs==='discharging'?'% — تفرغ':'% — ثابتة'} icon={<BatteryCharging size={18}/>} tone="green"/>
   <StatusCard label="الشبكة" value={data.gridConnected?'متصلة':'مفصولة'} icon={data.gridConnected?<Network size={18}/>:<WifiOff size={18}/>} tone={data.gridConnected?'violet':'red'}/>
  </div>
  <Section title="تدفق الطاقة" subtitle="الاتجاهات تتبع حالة البيانات الحالية"><EnergyFlow data={data}/><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">البطارية</span><strong className="mt-1 block">{data.batteryVoltage} V · {Math.abs(data.batteryCurrent??0)} A</strong></div><div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">قدرة الشحن/التفريغ</span><strong className="mt-1 block">{Math.abs(data.batteryPowerW/1000).toFixed(2)} kW</strong></div><div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">الشبكة</span><strong className="mt-1 block">{Math.abs(data.gridPowerW/1000).toFixed(2)} kW</strong></div></div></Section>
  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><strong>مصدر البيانات:</strong> لا يوجد جهاز طاقة متصل بالمشروع حاليًا. هذه القراءة التجريبية موسومة بوضوح، ولن تُعتبر قراءة حقيقية حتى تتم إضافة Adapter لمصدر الجهاز.</div>
 </div>
}