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

function power(valueW: number) {
  return `${(Math.abs(valueW) / 1000).toFixed(2)} kW`;
}

function FlowLine({
  x1,
  y1,
  x2,
  y2,
  active,
}: {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  active: boolean;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={active ? "#10b981" : "#cbd5e1"}
      strokeWidth="2.5"
      strokeDasharray={active ? "7 7" : "4 7"}
      className={active ? "animate-[dash_1.5s_linear_infinite]" : undefined}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function SolarHero({ data }: SolarHeroProps) {
  if (!data) {
    return (
      <section
        aria-label="شمسك — تدفق الطاقة"
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="relative aspect-[16/10] min-h-[330px]">
          <Image
            src="/images/1001085146.jpg"
            alt="مخطط تدفق الطاقة بين الشمس والشبكة والمنزل والبطارية"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1100px"
            className="object-cover object-center opacity-35"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-6 text-center backdrop-blur-[2px]">
            <div className="rounded-2xl border border-white/80 bg-white/90 px-5 py-4 shadow-sm">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                <Sun aria-hidden="true" size={24} />
              </div>
              <p className="mt-3 font-extrabold text-slate-900">شمسك</p>
              <p className="mt-1 text-sm text-slate-500">جارٍ تحميل بيانات الطاقة…</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const battery = batteryState(data.batteryPowerW);
  const batteryCharging = battery === "charging";
  const batteryDischarging = battery === "discharging";
  const gridImport = data.gridConnected && data.gridPowerW > 50;
  const gridExport = data.gridConnected && data.gridPowerW < -50;
  const solarActive = data.solarPowerW > 50;
  const homeActive = data.homePowerW > 50;
  const batteryActive = Math.abs(data.batteryPowerW) > 50;

  return (
    <section
      aria-label="شمسك — تدفق الطاقة الحالي"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <Sun aria-hidden="true" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-extrabold text-slate-900">شمسك</h2>
            <p className="truncate text-xs text-slate-500">إدارة ومراقبة الطاقة الشمسية في منزلك</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          {data.source === "demo" ? "Demo" : "Live"}
        </span>
      </div>

      <div className="relative aspect-[16/10] min-h-[360px] overflow-hidden bg-slate-50 sm:min-h-[470px]">
        <Image
          src="/images/1001085146.jpg"
          alt="مخطط الشمس والشبكة والمنزل والبطارية"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1100px"
          className="object-cover object-center opacity-[0.18]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/55 to-white/85" />

        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <FlowLine x1="50" y1="22" x2="50" y2="46" active={solarActive} />
          <FlowLine x1="22" y1="50" x2="42" y2="50" active={gridImport || gridExport} />
          <FlowLine x1="58" y1="50" x2="78" y2="50" active={homeActive} />
          <FlowLine x1="50" y1="78" x2="50" y2="58" active={batteryActive} />
        </svg>

        <div className="absolute inset-0 p-3 sm:p-6">
          <div className="absolute left-1/2 top-3 w-[42%] -translate-x-1/2 sm:top-6 sm:w-56">
            <EnergyNode
              icon={<Sun size={22} />}
              title="الشمس"
              value={power(data.solarPowerW)}
              detail={solarActive ? "إنتاج حالي" : "لا يوجد إنتاج واضح"}
              tone="amber"
            />
          </div>

          <div className="absolute left-2 top-1/2 w-[31%] -translate-y-1/2 sm:left-6 sm:w-52">
            <EnergyNode
              icon={data.gridConnected ? <Network size={21} /> : <Zap size={21} />}
              title="الشبكة"
              value={data.gridConnected ? power(data.gridPowerW) : "مفصولة"}
              detail={
                !data.gridConnected
                  ? "لا يوجد اتصال بالشبكة"
                  : gridImport
                    ? "سحب من الشبكة"
                    : gridExport
                      ? "تصدير إلى الشبكة"
                      : gridLabel(data.gridPowerW, true)
              }
              tone={data.gridConnected ? "violet" : "slate"}
            />
          </div>

          <div className="absolute right-2 top-1/2 w-[31%] -translate-y-1/2 sm:right-6 sm:w-52">
            <EnergyNode
              icon={<Home size={21} />}
              title="المنزل"
              value={power(data.homePowerW)}
              detail="استهلاك حالي"
              tone="blue"
            />
          </div>

          <div className="absolute bottom-3 left-1/2 w-[45%] -translate-x-1/2 sm:bottom-6 sm:w-56">
            <EnergyNode
              icon={batteryCharging ? <BatteryCharging size={22} /> : <BatteryFull size={22} />}
              title="البطارية"
              value={`${Math.round(data.batterySoc)}%`}
              detail={`${batteryStateLabel(battery)} · ${power(data.batteryPowerW)}`}
              tone={batteryCharging ? "emerald" : batteryDischarging ? "blue" : "slate"}
            />
          </div>

          <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-white shadow-xl sm:h-20 sm:w-20">
            <Zap aria-hidden="true" size={26} />
          </div>

          {solarActive && (
            <div className="absolute left-1/2 top-[34%] -translate-x-1/2 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm sm:text-xs">
              <ArrowDown aria-hidden="true" className="inline" size={12} /> تدفق شمسي
            </div>
          )}

          {gridImport && (
            <div className="absolute left-[31%] top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm sm:block">
              <ArrowRight aria-hidden="true" className="inline" size={12} /> سحب
            </div>
          )}

          {gridExport && (
            <div className="absolute left-[31%] top-[57%] hidden -translate-x-1/2 rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm sm:block">
              <ArrowLeft aria-hidden="true" className="inline" size={12} /> تصدير
            </div>
          )}

          {batteryActive && (
            <div className="absolute bottom-[28%] left-1/2 hidden -translate-x-1/2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm sm:block">
              {batteryCharging ? <ArrowDown aria-hidden="true" className="inline" size={12} /> : <ArrowUp aria-hidden="true" className="inline" size={12} />} {batteryStateLabel(battery)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-white rtl:divide-x-reverse">
        <Metric label="إنتاج اليوم" value={data.todayProductionKWh == null ? "—" : `${data.todayProductionKWh.toFixed(1)} kWh`} />
        <Metric label="استهلاك اليوم" value={data.todayHomeUsageKWh == null ? "—" : `${data.todayHomeUsageKWh.toFixed(1)} kWh`} />
        <Metric label="التوفير من الشبكة" value={data.todayGridSavings == null ? "—" : `${data.todayGridSavings.toFixed(1)} kWh`} />
      </div>
    </section>
  );
}

function EnergyNode({
  icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
  tone: "amber" | "blue" | "violet" | "emerald" | "slate";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50/95 text-amber-700",
    blue: "border-blue-200 bg-blue-50/95 text-blue-700",
    violet: "border-violet-200 bg-violet-50/95 text-violet-700",
    emerald: "border-emerald-200 bg-emerald-50/95 text-emerald-700",
    slate: "border-slate-200 bg-white/95 text-slate-600",
  };

  return (
    <div className={`min-w-0 rounded-2xl border p-2.5 text-center shadow-lg shadow-slate-900/5 backdrop-blur-sm sm:p-3`}>
      <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl ${tones[tone]} sm:h-9 sm:w-9`}>
        {icon}
      </div>
      <p className="mt-1 text-[10px] font-bold text-slate-500 sm:text-xs">{title}</p>
      <p className="truncate text-sm font-black text-slate-900 sm:text-lg">{value}</p>
      <p className="truncate text-[9px] font-semibold text-slate-500 sm:text-[11px]">{detail}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 py-3 text-center sm:px-4">
      <p className="truncate text-[10px] font-semibold text-slate-500 sm:text-xs">{label}</p>
      <p className="mt-1 truncate text-xs font-extrabold text-slate-900 sm:text-sm">{value}</p>
    </div>
  );
}

export default SolarHero;
