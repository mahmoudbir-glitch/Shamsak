import { ArrowLeft, BatteryCharging, House, Network, Sun, ArrowDownLeft, ArrowUpLeft } from "lucide-react";
import { EnergySnapshot, batteryState, batteryStateLabel, gridLabel } from "@/lib/energy";

export function EnergyFlow({ data }: { data: EnergySnapshot }) {
  const state = batteryState(data.batteryPowerW);
  const nodes = [
    { name: "الشمس", value: `${(data.solarPowerW/1000).toFixed(2)} kW`, Icon: Sun, tone: "bg-amber-50 text-amber-600" },
    { name: "المنزل", value: `${(data.homePowerW/1000).toFixed(2)} kW`, Icon: House, tone: "bg-blue-50 text-blue-600" },
    { name: "البطارية", value: `${data.batterySoc}% — ${batteryStateLabel(state)}`, Icon: BatteryCharging, tone: "bg-emerald-50 text-emerald-600" },
    { name: "الشبكة", value: gridLabel(data.gridPowerW, data.gridConnected), Icon: Network, tone: data.gridConnected ? "bg-violet-50 text-violet-600" : "bg-red-50 text-red-600" },
  ];
  const gridExport = data.gridPowerW < -50;
  const batteryCharge = data.batteryPowerW > 50;
  return <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
    {nodes.map((node, i) => <div key={node.name} className="contents">
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <span className={`rounded-xl p-2.5 ${node.tone}`}><node.Icon size={20}/></span>
        <div className="min-w-0"><div className="text-xs text-slate-500">{node.name}</div><div className="truncate text-sm font-bold">{node.value}</div></div>
      </div>
      {i < nodes.length - 1 && <div className="hidden items-center justify-center md:flex" aria-hidden="true"><ArrowLeft className="text-slate-300" size={18}/></div>}
    </div>)}
    <div className="md:col-span-full mt-1 grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{batteryCharge ? "☀️ الشمس تشحن البطارية حاليًا." : state === "discharging" ? "🔋 البطارية تغذي المنزل." : "🔋 البطارية ثابتة تقريبًا."}</div>
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{gridExport ? "↗️ يوجد تصدير للطاقة إلى الشبكة." : data.gridConnected ? "⚡ الشبكة متصلة ولا يوجد تصدير حالي واضح." : "⚠️ الشبكة مفصولة."}</div>
    </div>
  </div>;
}
