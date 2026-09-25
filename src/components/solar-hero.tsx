import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BatteryCharging,
  BatteryFull,
  Home,
  Network,
  Sun,
  Zap,
} from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel, gridLabel } from "@/lib/energy";

interface SolarHeroProps {
  data: EnergySnapshot | null;
}

function kw(w: number) {
  return `${(Math.abs(w) / 1000).toFixed(2)} kW`;
}

function FlowLine({ direction, active }: { direction: "up" | "down" | "left" | "right"; active: boolean }) {
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : direction === "left" ? ArrowLeft : ArrowRight;
  return (
    <div className={`absolute z-20 flex items-center justify-center ${direction === "up" ? "left-1/2 top-[28%] h-[17%] w-8 -translate-x-1/2" : direction === "down" ? "bottom-[28%] left-1/2 h-[17%] w-8 -translate-x-1/2" : direction === "left" ? "left-[28%] top-1/2 h-8 w-[17%] -translate-y-1/2" : "right-[28%] top-1/2 h-8 w-[17%] -translate-y-1/2"} `}>
      <span className={`absolute inset-0 border-dashed border-slate-300 ${direction === "up" || direction === "down" ? "border-l-2" : "border-t-2"} ${active ? "animate-pulse border-emerald-400" : ""}`} />
      <Icon size={18} aria-hidden="true" className={`relative rounded-full bg-white p-1 shadow-sm ${active ? "text-emerald-600" : "text-slate-400"}`} />
    </div>
  );
}

export function SolarHero({ data }: SolarHeroProps) {
  if (!data) {
    return (
      <section aria-label="شمسك" className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="relative aspect-[16/9] w-full bg-slate-100">
          <Image src="/images/1001085146.jpg" alt="واجهة شمسك لتدفق الطاقة الشمسية" fill priority sizes="100vw" className="object-contain" />
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
            <div className="rounded-2xl bg-white/95 px-5 py-4 text-center shadow-lg">
              <Sun className="mx-auto mb-2 text-amber-500" aria-hidden="true" />
              <p className="font-extrabold text-slate-900">شمسك</p>
              <p className="mt-1 text-sm text-slate-500">جارٍ تحميل بيانات الطاقة…</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const bs = batteryState(data.batteryPowerW);
  const batteryCharging = bs === "charging";
  const batteryDischarging = bs === "discharging";
  const gridImport = data.gridPowerW > 50;
  const gridExport = data.gridPowerW < -50;
  const solarActive = data.solarPowerW > 50;
  const sourceLabel = data.source === "demo" ? "Demo — بيانات تجريبية" : "Live — بيانات حية";

  return (
    <section aria-labelledby="solar-hero-title" className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sun size={20} className="text-amber-500" aria-hidden="true" />
              <h2 id="solar-hero-title" className="text-xl font-black text-slate-900">شمسك</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">إدارة ومراقبة الطاقة الشمسية في منزلك</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${data.source === "demo" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{sourceLabel}</span>
        </div>
      </div>

      <div className="relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden bg-slate-50">
        <Image
          src="/images/1001085146.jpg"
          alt="مخطط تدفق الطاقة بين الشمس والشبكة والمنزل والبطارية"
          fill
          sizes="(max-width: 640px) 100vw, 1024px"
          className="object-contain opacity-20"
          priority
        />

        <div className="absolute inset-0">
          <FlowLine direction="down" active={solarActive} />
          <FlowLine direction="right" active={gridImport || gridExport} />
          <FlowLine direction="left" active={data.homePowerW > 50} />
          <FlowLine direction="up" active={batteryCharging || batteryDischarging} />

          <div className="absolute left-1/2 top-1/2 z-30 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-white shadow-xl sm:h-20 sm:w-20">
            <Zap size={26} fill="currentColor" aria-label="مركز تدفق الطاقة" />
          </div>

          <div className="absolute left-1/2 top-3 z-30 w-[42%] -translate-x-1/2 sm:top-5 sm:w-44">
            <div className="rounded-2xl border border-amber-100 bg-white/95 p-2.5 text-center shadow-md backdrop-blur sm:p-3">
              <Sun className="mx-auto text-amber-500" size={24} aria-hidden="true" />
              <p className="mt-1 text-xs font-bold text-slate-500">الشمس</p>
              <p className="text-base font-black text-slate-900 sm:text-xl">{kw(data.solarPowerW)}</p>
              <p className="text-[10px] font-semibold text-amber-700">{solarActive ? "إنتاج حالي" : "لا إنتاج حاليًا"}</p>
            </div>
          </div>

          <div className="absolute right-2 top-1/2 z-30 w-[34%] -translate-y-1/2 sm:right-6 sm:w-40">
            <div className="rounded-2xl border border-blue-100 bg-white/95 p-2.5 text-center shadow-md backdrop-blur sm:p-3">
              <Home className="mx-auto text-blue-600" size={24} aria-hidden="true" />
              <p className="mt-1 text-xs font-bold text-slate-500">المنزل</p>
              <p className="text-base font-black text-slate-900 sm:text-xl">{kw(data.homePowerW)}</p>
              <p className="text-[10px] font-semibold text-blue-700">استهلاك حالي</p>
            </div>
          </div>

          <div className="absolute left-2 top-1/2 z-30 w-[34%] -translate-y-1/2 sm:left-6 sm:w-40">
            <div className="rounded-2xl border border-violet-100 bg-white/95 p-2.5 text-center shadow-md backdrop-blur sm:p-3">
              <Network className="mx-auto text-violet-600" size={24} aria-hidden="true" />
              <p className="mt-1 text-xs font-bold text-slate-500">الشبكة</p>
              <p className={`text-sm font-black sm:text-base ${data.gridConnected ? "text-violet-700" : "text-slate-500"}`}>{data.gridConnected ? "متصلة" : "مفصولة"}</p>
              {data.gridConnected ? <p className="text-[10px] font-semibold text-violet-600">{gridImport ? `سحب ${kw(data.gridPowerW)}` : gridExport ? `تصدير ${kw(data.gridPowerW)}` : gridLabel(data.gridPowerW, true)}</p> : <p className="text-[10px] font-semibold text-slate-500">لا يوجد اتصال</p>}
            </div>
          </div>

          <div className="absolute bottom-3 left-1/2 z-30 w-[44%] -translate-x-1/2 sm:bottom-5 sm:w-48">
            <div className={`rounded-2xl border bg-white/95 p-2.5 text-center shadow-md backdrop-blur sm:p-3 ${batteryCharging ? "border-emerald-200" : batteryDischarging ? "border-blue-200" : "border-slate-200"}`}>
              {batteryCharging ? <BatteryCharging className="mx-auto text-emerald-600" size={25} /> : <BatteryFull className="mx-auto text-emerald-600" size={25} />}
              <p className="mt-1 text-xs font-bold text-slate-500">البطارية</p>
              <p className="text-lg font-black text-slate-900">{data.batterySoc}%</p>
              <p className="text-[10px] font-semibold text-emerald-700">{batteryStateLabel(bs)} {kw(data.batteryPowerW)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-white p-3 sm:gap-3 sm:p-4">
        <Metric label="إنتاج اليوم" value={data.todayProductionKWh == null ? "—" : `${data.todayProductionKWh.toFixed(1)} kWh`} />
        <Metric label="استهلاك اليوم" value={data.todayHomeUsageKWh == null ? "—" : `${data.todayHomeUsageKWh.toFixed(1)} kWh`} />
        <Metric label="التوفير من الشبكة" value={data.todayGridSavings == null ? "—" : `${data.todayGridSavings.toFixed(1)}`} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-2.5 text-center sm:p-3"><p className="text-[10px] font-semibold text-slate-500 sm:text-xs">{label}</p><p className="mt-1 text-sm font-black text-slate-900 sm:text-base">{value}</p></div>;
}

export default SolarHero;
