import {ArrowLeft, BatteryCharging, House, Network, Sun} from 'lucide-react';
import {EnergySnapshot,batteryState,gridLabel} from '@/lib/energy';
export function EnergyFlow({data}:{data:EnergySnapshot}){
 const bs=batteryState(data.batteryPowerW);
 const solar=data.solarPowerW/1000,load=data.homePowerW/1000,battery=Math.abs(data.batteryPowerW)/1000,grid=Math.abs(data.gridPowerW)/1000;
 const nodes=[['الشمس',solar.toFixed(2)+' kW',Sun,'bg-amber-50 text-amber-600'],['البطارية',data.batterySoc+'%',BatteryCharging,'bg-emerald-50 text-emerald-600'],['المنزل',load.toFixed(2)+' kW',House,'bg-blue-50 text-blue-600'],['الشبكة',gridLabel(data.gridPowerW,data.gridConnected),Network,data.gridConnected?'bg-violet-50 text-violet-600':'bg-red-50 text-red-600']] as const;
 return <div className="grid gap-3 sm:grid-cols-4">{nodes.map(([name,value,Icon,tone],i)=><div key={name} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><span className={`rounded-xl p-2.5 ${tone}`}><Icon size={20}/></span><div className="min-w-0"><div className="text-xs text-slate-500">{name}</div><div className="truncate text-sm font-bold">{value}</div></div>{i<3&&<ArrowLeft className="mr-auto hidden text-slate-300 sm:block" size={16}/>}</div>)}</div>
}