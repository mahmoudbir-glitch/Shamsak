import { Home, Network, Sun, Zap } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel, gridLabel } from "@/lib/energy";

interface SolarHeroProps {
  data: EnergySnapshot | null;
}

function kw(value: number) {
  return (Math.abs(value) / 1000).toFixed(2);
}

function kwh(value?: number) {
  return value == null ? "—" : value.toFixed(1);
}

function FlowLine({
  direction,
  active,
  color,
}: {
  direction: "up" | "down" | "left" | "right";
  active: boolean;
  color: string;
}) {
  const points =
    direction === "up"
      ? "50,100 50,0"
      : direction === "down"
        ? "50,0 50,100"
        : direction === "left"
          ? "100,50 0,50"
          : "0,50 100,50";

  const [from, to] = points.split(" ");
  const [x1, y1] = from.split(",");
  const [x2, y2] = to.split(",");

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth="2.2"
        strokeDasharray="8 8"
        strokeLinecap="round"
        opacity={active ? 0.85 : 0.22}
        style={active ? { animation: "dash 1.4s linear infinite" } : undefined}
      />
      {active && <circle cx="50" cy="50" r="3" fill={color} className="animate-pulse" />}
    </svg>
  );
}

const nodeTones = {
  solar: "border-amber-200 bg-white text-amber-700 shadow-[0_8px_28px_rgba(245,158,11,.10)]",
  home: "border-sky-200 bg-white text-sky-700 shadow-[0_8px_28px_rgba(14,165,233,.10)]",
  battery: "border-emerald-200 bg-white text-emerald-700 shadow-[0_8px_28px_rgba(16,185,129,.10)]",
  grid: "border-violet-200 bg-white text-violet-700 shadow-[0_8px_28px_rgba(139,92,246,.10)]",
} as const;

function Node({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: keyof typeof nodeTones;
}) {
  return (
    <div
      className={`relative z-20 box-border flex h-[112px] w-full max-w-[104px] flex-col items-center justify-center rounded-2xl border p-2 text-center backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:h-[154px] sm:max-w-[158px] sm:p-3 ${nodeTones[tone]}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 sm:h-11 sm:w-11">
        {icon}
      </div>
      <p className="mt-1.5 text-[9px] font-bold tracking-[0.08em] text-slate-400">{title}</p>
      <p className="mt-1 text-base font-black text-slate-900 sm:text-xl">{value}</p>
      <p className="mt-1 text-[9px] font-bold text-slate-500">{subtitle}</p>
    </div>
  );
}

function BatteryNode({
  soc,
  state,
  power,
}: {
  soc: number;
  state: ReturnType<typeof batteryState>;
  power: number;
}) {
  const safe = Math.min(100, Math.max(0, soc));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative z-20 box-border flex h-[112px] w-full max-w-[104px] flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-white p-2 text-center text-emerald-700 shadow-[0_8px_28px_rgba(16,185,129,.10)] backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:h-[154px] sm:max-w-[158px] sm:p-3">
      <div className="relative h-[66px] w-[66px] shrink-0" aria-label={`نسبة البطارية ${safe}%`}>
        <svg className="-rotate-90" viewBox="0 0 76 76" aria-hidden="true">
          <circle cx="38" cy="38" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="7" />
          <circle
            cx="38"
            cy="38"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - safe / 100)}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-black text-slate-900">
          {safe}%
        </span>
      </div>
      <p className="mt-1.5 text-[9px] font-bold tracking-[0.08em] text-slate-400">حالة البطارية</p>
      <p className="mt-1 text-[9px] font-bold text-slate-600">
        {batteryStateLabel(state)} · {kw(power)} kW
      </p>
    </div>
  );
}

export function SolarHero({ data }: SolarHeroProps) {
  if (!data) {
    return (
      <section
        aria-label="شمسك - تدفق الطاقة"
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,.08)]"
      >
        <div className="flex min-h-[390px] items-center justify-center p-6">
          <div className="text-center">
            <Sun className="mx-auto animate-pulse text-amber-500" size={36} aria-hidden="true" />
            <p className="mt-3 font-bold text-slate-800">جارٍ تحميل بيانات الطاقة…</p>
            <p className="mt-1 text-xs text-slate-500">يرجى الانتظار لحظة</p>
          </div>
        </div>
      </section>
    );
  }

  const state = batteryState(data.batteryPowerW);
  const charging = state === "charging";
  const discharging = state === "discharging";
  const gridImport = data.gridConnected && data.gridPowerW > 50;
  const gridExport = data.gridConnected && data.gridPowerW < -50;
  const solarActive = data.solarPowerW > 50;

  return (
    <section
      aria-labelledby="solar-hero-title"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,.09)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-sm">
            <Sun size={23} aria-hidden="true" />
          </div>
          <div>
            <h2 id="solar-hero-title" className="text-xl font-black text-slate-900">
              شمسك
            </h2>
            <p className="text-xs font-semibold text-slate-500">إدارة ومراقبة الطاقة الشمسية</p>
          </div>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
          الشمس أولاً
        </span>
      </div>

      <div className="relative overflow-hidden bg-slate-50/60 px-3 py-6 sm:px-6 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(37,99,235,.07),transparent_38%),radial-gradient(circle_at_50%_0%,rgba(245,158,11,.08),transparent_28%)]" />
        <div className="relative mx-auto max-w-[900px]">
          <div className="mb-3 flex justify-end">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                data.source === "demo"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {data.source === "demo" ? "Demo — بيانات تجريبية" : "Live — بيانات حية"}
            </span>
          </div>

          <div className="mx-auto box-border grid w-full max-w-[820px] grid-cols-[minmax(0,1fr)_20px_64px_20px_minmax(0,1fr)] grid-rows-[auto_38px_auto_38px_auto] items-center justify-items-center gap-1 overflow-visible sm:grid-cols-[minmax(158px,1fr)_78px_minmax(110px,1fr)_78px_minmax(158px,1fr)] sm:grid-rows-[auto_78px_auto_78px_auto] sm:gap-3">
            <div className="col-start-3 row-start-1">
              <Node
                tone="solar"
                title="SOLAR"
                value={`${kw(data.solarPowerW)} kW`}
                subtitle={solarActive ? "إنتاج حالي" : "لا إنتاج حاليًا"}
                icon={<Sun size={25} />}
              />
            </div>

            <div className="col-start-3 row-start-2 row-span-1 flex h-full w-full items-center justify-center">
              <FlowLine direction="down" active={solarActive} color="#d97706" />
            </div>

            <div className="col-start-1 row-start-3">
              <Node
                tone="grid"
                title="GRID STATUS"
                value={data.gridConnected ? "متصلة" : "مقطوعة"}
                subtitle={!data.gridConnected ? "لا يوجد اتصال" : gridLabel(data.gridPowerW, true)}
                icon={<Network size={25} />}
              />
            </div>

            <div className="col-start-2 row-start-3 flex h-full w-full items-center justify-center">
              <FlowLine direction="right" active={gridImport || gridExport} color="#7c3aed" />
            </div>

            <div className="col-start-3 row-start-3 flex h-[88px] w-[88px] items-center justify-center rounded-full border border-blue-200 bg-white shadow-[0_10px_30px_rgba(37,99,235,.12)] sm:h-[104px] sm:w-[104px]">
              <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full border border-blue-100 bg-blue-50 sm:h-[78px] sm:w-[78px]">
                <Zap className="text-blue-700" size={30} aria-hidden="true" />
              </div>
            </div>

            <div className="col-start-4 row-start-3 flex h-full w-full items-center justify-center">
              <FlowLine direction="right" active={data.homePowerW > 50} color="#0284c7" />
            </div>

            <div className="col-start-5 row-start-3">
              <Node
                tone="home"
                title="HOME CONSUMPTION"
                value={`${kw(data.homePowerW)} kW`}
                subtitle="استهلاك حالي"
                icon={<Home size={25} />}
              />
            </div>

            <div className="col-start-3 row-start-4 flex h-full w-full items-center justify-center">
              <FlowLine direction="down" active={charging || discharging} color="#059669" />
            </div>

            <div className="col-start-3 row-start-5">
              <BatteryNode soc={data.batterySoc} state={state} power={data.batteryPowerW} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-white">
        <Stat label="TODAY'S PRODUCTION" value={kwh(data.todayProductionKWh)} unit="kWh" tone="text-amber-700" />
        <Stat label="HOME USAGE" value={kwh(data.todayHomeUsageKWh)} unit="kWh" tone="text-blue-700" />
        <Stat
          label="GRID SAVINGS"
          value={data.todayGridSavings == null ? "—" : data.todayGridSavings.toFixed(2)}
          unit={data.todayGridSavings == null ? "" : "$"}
          tone="text-emerald-700"
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <div className="min-w-0 px-2 py-4 text-center sm:px-4">
      <p className="truncate text-[8px] font-bold tracking-[0.08em] text-slate-400 sm:text-[10px]">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone} sm:text-2xl`}>
        {value} <span className="text-[10px] font-bold text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

export default SolarHero;
