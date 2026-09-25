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
    <svg aria-hidden="true" className="pointer-events-none h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.2" strokeDasharray="8 8" strokeLinecap="round" opacity={active ? 1 : 0.2} style={active ? { animation: "dash 1.4s linear infinite" } : undefined} />
      {active && <circle cx="50" cy="50" r="3" fill={color} className="animate-pulse" />}
    </svg>
  );
}

const nodeTones = {
  solar: "border-amber-400/40 bg-slate-900/95 text-amber-300 shadow-[0_0_28px_rgba(245,158,11,.14)]",
  home: "border-cyan-400/40 bg-slate-900/95 text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,.14)]",
  battery: "border-emerald-400/40 bg-slate-900/95 text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,.14)]",
  grid: "border-violet-400/40 bg-slate-900/95 text-violet-300 shadow-[0_0_28px_rgba(139,92,246,.14)]",
} as const;

function Node({ title, value, subtitle, icon, tone }: { title: string; value: string; subtitle: string; icon: React.ReactNode; tone: keyof typeof nodeTones }) {
  return (
    <div className={`relative z-20 box-border flex h-[112px] w-full max-w-[104px] flex-col items-center justify-center rounded-2xl border p-2 text-center backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:h-[154px] sm:max-w-[158px] sm:p-3${nodeTones[tone]}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 sm:h-11 sm:w-11">{icon}</div>
      <p className="mt-1.5 text-[9px] font-bold tracking-[0.08em] text-white/55">{title}</p>
      <p className="mt-1 text-base font-black text-white sm:text-xl">{value}</p>
      <p className="mt-1 text-[9px] font-bold text-white/60">{subtitle}</p>
    </div>
  );
}

function BatteryNode({ soc, state, power }: { soc: number; state: ReturnType<typeof batteryState>; power: number }) {
  const safe = Math.min(100, Math.max(0, soc));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative z-20 box-border flex h-[112px] w-full max-w-[104px] flex-col items-center justify-center rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-2 text-center text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,.14)] backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:h-[154px] sm:max-w-[158px] sm:p-3">
      <div className="relative h-[66px] w-[66px] shrink-0" aria-label={`نسبة البطارية ${safe}%`}>
        <svg className="-rotate-90" viewBox="0 0 76 76" aria-hidden="true">
          <circle cx="38" cy="38" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
          <circle cx="38" cy="38" r={radius} fill="none" stroke="#34d399" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safe / 100)} className="transition-all duration-700" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-black text-white">{safe}%</span>
      </div>
      <p className="mt-1.5 text-[9px] font-bold tracking-[0.08em] text-white/55">BATTERY STATUS</p>
      <p className="mt-1 text-[9px] font-bold text-white/70">{batteryStateLabel(state)} · {kw(power)} kW</p>
    </div>
  );
}

export function SolarHero({ data }: SolarHeroProps) {
  if (!data) {
    return (
      <section aria-label="شمسك - تدفق الطاقة" className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-xl">
        <div className="flex min-h-[390px] items-center justify-center p-6">
          <div className="text-center">
            <Sun className="mx-auto animate-pulse text-amber-400" size={36} aria-hidden="true" />
            <p className="mt-3 font-bold text-white">جارٍ تحميل بيانات الطاقة…</p>
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
    <section aria-labelledby="solar-hero-title" className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-[0_20px_70px_rgba(2,6,23,.22)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,.16)]"><Sun size={23} aria-hidden="true" /></div>
          <div><h2 id="solar-hero-title" className="text-xl font-black text-white">شمسك</h2><p className="text-xs font-semibold text-white/50">إدارة ومراقبة الطاقة الشمسية</p></div>
        </div>
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-300">الشمس أولاً</span>
      </div>

      <div className="relative overflow-hidden px-3 py-6 sm:px-6 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(37,99,235,.11),transparent_38%),radial-gradient(circle_at_50%_0%,rgba(245,158,11,.08),transparent_28%)]" />
        <div className="relative mx-auto max-w-[900px]">
          <div className="mb-3 flex justify-end">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${data.source === "demo" ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>
              {data.source === "demo" ? "Demo — بيانات تجريبية" : "Live — بيانات حية"}
            </span>
          </div>

          <div className="mx-auto box-border grid w-full max-w-[820px] grid-cols-[minmax(0,1fr)_20px_64px_20px_minmax(0,1fr)] grid-rows-[auto_38px_auto_38px_auto] items-center justify-items-center gap-1 overflow-visible sm:grid-cols-[minmax(158px,1fr)_78px_minmax(110px,1fr)_78px_minmax(158px,1fr)] sm:grid-rows-[auto_78px_auto_78px_auto] sm:gap-3">
            <div className="col-start-3 row-start-1"><Node tone="solar" title="SOLAR" value={`${kw(data.solarPowerW)} kW`} subtitle={solarActive ? "إنتاج حالي" : "لا إنتاج حاليًا"} icon={<Sun size={25} />} /></div>
            <div className="col-start-3 row-start-2 row-span-1 flex h-full w-full items-center justify-center"><FlowLine direction="down" active={solarActive} color="#f59e0b" /></div>
            <div className="col-start-1 row-start-3"><Node tone="grid" title="GRID STATUS" value={data.gridConnected ? "متصلة" : "مقطوعة"} subtitle={!data.gridConnected ? "لا يوجد اتصال" : gridLabel(data.gridPowerW, true)} icon={<Network size={25} />} /></div>
            <div className="col-start-2 row-start-3 flex h-full w-full items-center justify-center"><FlowLine direction="right" active={gridImport || gridExport} color="#8b5cf6" /></div>
            <div className="col-start-3 row-start-3 flex h-[88px] w-[88px] items-center justify-center rounded-full border border-blue-300/20 bg-slate-900 shadow-[0_0_35px_rgba(59,130,246,.25)] sm:h-[104px] sm:w-[104px]">
              <div className="flex h-[66px] w-[66px] items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 sm:h-[78px] sm:w-[78px]"><Zap className="text-blue-300" size={30} aria-hidden="true" /></div>
            </div>
            <div className="col-start-4 row-start-3 flex h-full w-full items-center justify-center"><FlowLine direction="right" active={data.homePowerW > 50} color="#22d3ee" /></div>
            <div className="col-start-5 row-start-3"><Node tone="home" title="HOME CONSUMPTION" value={`${kw(data.homePowerW)} kW`} subtitle="استهلاك حالي" icon={<Home size={25} />} /></div>
            <div className="col-start-3 row-start-4 flex h-full w-full items-center justify-center"><FlowLine direction="down" active={charging || discharging} color="#34d399" /></div>
            <div className="col-start-3 row-start-5"><BatteryNode soc={data.batterySoc} state={state} power={data.batteryPowerW} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-slate-900/80">
        <Stat label="TODAY'S PRODUCTION" value={kwh(data.todayProductionKWh)} unit="kWh" tone="text-cyan-300" />
        <Stat label="HOME USAGE" value={kwh(data.todayHomeUsageKWh)} unit="kWh" tone="text-blue-300" />
        <Stat label="GRID SAVINGS" value={data.todayGridSavings == null ? "—" : data.todayGridSavings.toFixed(2)} unit={data.todayGridSavings == null ? "" : "$"} tone="text-amber-300" />
      </div>
    </section>
  );
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: string }) {
  return (
    <div className="min-w-0 px-2 py-4 text-center sm:px-4">
      <p className="truncate text-[8px] font-bold tracking-[0.08em] text-white/40 sm:text-[10px]">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone} sm:text-2xl`}>{value} <span className="text-[10px] font-bold text-white/45">{unit}</span></p>
    </div>
  );
}

export default SolarHero;
