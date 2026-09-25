import {
  BatteryCharging,
  Home,
  Network,
  Sun,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel } from "@/lib/energy";

interface SolarHeroProps {
  data: EnergySnapshot | null;
}

type FlowTone = "solar" | "grid" | "home" | "battery";

function kw(value: number) {
  return (Math.abs(value) / 1000).toFixed(2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const tone = {
  solar: {
    text: "text-amber-300",
    border: "border-amber-400/60",
    glow: "shadow-[0_0_30px_rgba(251,191,36,.18)]",
    icon: "bg-amber-400/10 text-amber-300",
  },
  grid: {
    text: "text-orange-300",
    border: "border-orange-400/60",
    glow: "shadow-[0_0_30px_rgba(251,146,60,.16)]",
    icon: "bg-orange-400/10 text-orange-300",
  },
  home: {
    text: "text-sky-300",
    border: "border-sky-400/60",
    glow: "shadow-[0_0_30px_rgba(56,189,248,.16)]",
    icon: "bg-sky-400/10 text-sky-300",
  },
  battery: {
    text: "text-emerald-300",
    border: "border-emerald-400/60",
    glow: "shadow-[0_0_30px_rgba(52,211,153,.18)]",
    icon: "bg-emerald-400/10 text-emerald-300",
  },
} satisfies Record<FlowTone, Record<string, string>>;

function EnergyNode({
  title,
  value,
  subtitle,
  icon,
  variant,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  variant: FlowTone;
}) {
  const t = tone[variant];

  return (
    <div
      className={`relative z-20 flex w-[112px] flex-col items-center text-center sm:w-[160px] ${t.glow}`}
    >
      <div
        className={`flex h-[78px] w-[78px] items-center justify-center rounded-[22px] border-2 bg-slate-900/85 backdrop-blur sm:h-[108px] sm:w-[108px] sm:rounded-[28px] ${t.border}`}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl sm:h-16 sm:w-16 ${t.icon}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-[10px] font-black tracking-[0.12em] text-slate-300 sm:text-xs">
        {title}
      </p>
      <p className={`mt-1 text-xl font-black tracking-tight sm:text-3xl ${t.text}`}>
        {value}
      </p>
      <p className="mt-0.5 max-w-[150px] text-[10px] font-semibold text-slate-400 sm:text-xs">
        {subtitle}
      </p>
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
  const safe = clamp(Math.round(soc), 0, 100);
  const circumference = 2 * Math.PI * 31;
  const stroke = state === "discharging" ? "#38bdf8" : "#34d399";

  return (
    <div className="relative z-20 flex w-[140px] flex-col items-center text-center sm:w-[180px]">
      <div className="relative flex h-[112px] w-[112px] items-center justify-center rounded-[28px] border-2 border-emerald-400/70 bg-slate-900/90 shadow-[0_0_38px_rgba(52,211,153,.2)] sm:h-[132px] sm:w-[132px]">
        <svg
          className="-rotate-90 absolute inset-0 h-full w-full"
          viewBox="0 0 72 72"
          aria-hidden="true"
        >
          <circle cx="36" cy="36" r="31" fill="none" stroke="#1e293b" strokeWidth="4.5" />
          <circle
            cx="36"
            cy="36"
            r="31"
            fill="none"
            stroke={stroke}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - safe / 100)}
            className="transition-all duration-700"
          />
        </svg>
        <div className="relative">
          <p className="text-2xl font-black text-white sm:text-3xl">{safe}%</p>
          <BatteryCharging
            size={16}
            className={state === "discharging" ? "mx-auto mt-1 text-sky-300" : "mx-auto mt-1 text-emerald-300"}
            aria-hidden="true"
          />
        </div>
      </div>
      <p className="mt-2 text-[10px] font-black tracking-[0.12em] text-slate-300 sm:text-xs">
        BATTERY STATUS
      </p>
      <p className="mt-1 text-lg font-black text-emerald-300 sm:text-2xl">
        {kw(power)} kW
      </p>
      <p className={`text-xs font-bold ${state === "discharging" ? "text-sky-300" : "text-emerald-300"}`}>
        {batteryStateLabel(state)}
      </p>
    </div>
  );
}

function FlowMap({
  solarActive,
  homeActive,
  gridActive,
  batteryActive,
  charging,
  discharging,
  gridExport,
}: {
  solarActive: boolean;
  homeActive: boolean;
  gridActive: boolean;
  batteryActive: boolean;
  charging: boolean;
  discharging: boolean;
  gridExport: boolean;
}) {
  const paths = [
    {
      d: "M50 25 C50 33 50 38 50 47",
      color: "#fbbf24",
      active: solarActive,
    },
    {
      d: "M31 51 C38 51 42 51 47 51",
      color: "#fb923c",
      active: gridActive,
    },
    {
      d: "M69 51 C62 51 58 51 53 51",
      color: "#38bdf8",
      active: homeActive,
    },
    {
      d: "M50 56 C50 63 50 68 50 76",
      color: charging ? "#34d399" : "#38bdf8",
      active: batteryActive,
    },
    {
      d: "M47 48 C40 42 35 37 29 32",
      color: "#34d399",
      active: charging,
    },
    {
      d: "M53 48 C60 42 65 37 71 32",
      color: "#38bdf8",
      active: discharging,
    },
    {
      d: gridExport ? "M47 55 C39 60 32 64 25 69" : "M25 69 C32 64 39 60 47 55",
      color: "#fb923c",
      active: gridActive && gridExport,
    },
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <filter id="energy-glow">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {paths.map((path, index) => (
        <g key={`flow-${index}`}>
          <path
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeWidth={path.active ? "0.9" : "0.45"}
            strokeDasharray={path.active ? "2.4 2.2" : "1.5 3.5"}
            strokeLinecap="round"
            opacity={path.active ? 0.9 : 0.16}
            filter={path.active ? "url(#energy-glow)" : undefined}
          />
          {path.active && (
            <circle r="1.25" fill={path.color} filter="url(#energy-glow)">
              <animateMotion dur="1.7s" repeatCount="indefinite" path={path.d} />
            </circle>
          )}
        </g>
      ))}
    </svg>
  );
}

export function SolarHero({ data }: SolarHeroProps) {
  if (!data) {
    return (
      <section
        aria-label="شمسك - تدفق الطاقة"
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,.18)]"
      >
        <div className="flex min-h-[520px] items-center justify-center p-6">
          <div className="text-center" role="status" aria-live="polite">
            <Sun className="mx-auto animate-pulse text-amber-300" size={42} aria-hidden="true" />
            <p className="mt-4 font-black text-white">جارٍ تحميل بيانات الطاقة…</p>
            <p className="mt-1 text-xs text-slate-400">يتم تجهيز مخطط التدفق اللحظي</p>
          </div>
        </div>
      </section>
    );
  }

  const state = batteryState(data.batteryPowerW);
  const charging = state === "charging";
  const discharging = state === "discharging";
  const solarActive = data.solarPowerW > 50;
  const homeActive = data.homePowerW > 50;
  const gridImport = data.gridConnected && data.gridPowerW > 50;
  const gridExport = data.gridConnected && data.gridPowerW < -50;
  const gridActive = gridImport || gridExport;
  const batteryActive = charging || discharging;

  const statusText = !data.gridConnected
    ? "الشبكة مفصولة"
    : gridExport
      ? "فائض يُصدّر للشبكة"
      : gridImport
        ? "سحب من الشبكة"
        : charging
          ? "الشمس أولاً — البطارية تشحن"
          : discharging
            ? "البطارية تدعم المنزل"
            : "تدفق الطاقة متوازن";

  return (
    <section
      aria-labelledby="solar-hero-title"
      className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#061b31] text-white shadow-[0_24px_70px_rgba(2,12,27,.25)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#071f36]/90 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-300/10 text-amber-300 shadow-[0_0_25px_rgba(251,191,36,.14)]">
            <Sun size={24} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="solar-hero-title" className="text-xl font-black">
              شمسك ☀️
            </h2>
            <p className="truncate text-xs font-semibold text-slate-400">
              إدارة ومراقبة الطاقة الشمسية
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black ${
            data.source === "demo"
              ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
              : "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
          }`}
        >
          {data.source === "demo" ? "DEMO" : "LIVE"}
        </span>
      </header>

      <div className="relative overflow-hidden px-3 py-5 sm:px-6 sm:py-7">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 50% 18%, rgba(251,191,36,.12), transparent 20%), radial-gradient(circle at 50% 58%, rgba(16,185,129,.07), transparent 28%), radial-gradient(circle at 100% 55%, rgba(56,189,248,.08), transparent 22%)",
          }}
        />

        <div className="relative mx-auto max-w-[980px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
              <span className="text-xs font-bold text-slate-300">حالة النظام الآن</span>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black text-slate-200">
              {statusText}
            </span>
          </div>

          <div className="relative mx-auto mt-3 aspect-[0.82] w-full max-w-[620px] sm:aspect-[1/1] sm:max-w-[780px]">
            <FlowMap
              solarActive={solarActive}
              homeActive={homeActive}
              gridActive={gridActive}
              batteryActive={batteryActive}
              charging={charging}
              discharging={discharging}
              gridExport={gridExport}
            />

            <div className="absolute left-1/2 top-[3%] z-20 -translate-x-1/2">
              <EnergyNode
                variant="solar"
                title="SOLAR"
                value={`${kw(data.solarPowerW)} kW`}
                subtitle={solarActive ? "إنتاج حالي" : "لا إنتاج حاليًا"}
                icon={<Sun size={34} aria-hidden="true" />}
              />
            </div>

            <div className="absolute left-[1%] top-[45%] z-20">
              <EnergyNode
                variant="grid"
                title="GRID STATUS"
                value={!data.gridConnected ? "مفصولة" : `${kw(data.gridPowerW)} kW`}
                subtitle={
                  !data.gridConnected
                    ? "لا يوجد اتصال"
                    : gridImport
                      ? "Importing"
                      : gridExport
                        ? "Exporting"
                        : "Balanced"
                }
                icon={<Network size={32} aria-hidden="true" />}
              />
            </div>

            <div className="absolute right-[1%] top-[45%] z-20">
              <EnergyNode
                variant="home"
                title="HOME CONSUMPTION"
                value={`${kw(data.homePowerW)} kW`}
                subtitle={homeActive ? "استهلاك حالي" : "لا استهلاك حاليًا"}
                icon={<Home size={32} aria-hidden="true" />}
              />
            </div>

            <div className="absolute bottom-[2%] left-1/2 z-20 -translate-x-1/2">
              <BatteryNode soc={data.batterySoc} state={state} power={data.batteryPowerW} />
            </div>

            <div className="absolute left-1/2 top-[47%] z-20 -translate-x-1/2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-[#0a2742]/95 shadow-[0_0_35px_rgba(56,189,248,.12)] ring-4 ring-[#061b31] sm:h-20 sm:w-20">
                <Zap
                  size={28}
                  className={solarActive ? "text-amber-300" : "text-slate-500"}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-black/10">
            <div className="min-w-0 border-l border-white/10 px-2 py-4 text-center sm:px-4">
              <p className="truncate text-[9px] font-black tracking-[0.08em] text-slate-400 sm:text-xs">
                TODAY'S PRODUCTION
              </p>
              <p className="mt-1 text-lg font-black text-emerald-300 sm:text-2xl">
                {data.todayProductionKWh != null ? `${data.todayProductionKWh.toFixed(1)} kWh` : "—"}
              </p>
            </div>
            <div className="min-w-0 border-l border-white/10 px-2 py-4 text-center sm:px-4">
              <p className="truncate text-[9px] font-black tracking-[0.08em] text-slate-400 sm:text-xs">
                HOME USAGE
              </p>
              <p className="mt-1 text-lg font-black text-emerald-300 sm:text-2xl">
                {data.todayHomeUsageKWh != null ? `${data.todayHomeUsageKWh.toFixed(1)} kWh` : "—"}
              </p>
            </div>
            <div className="min-w-0 px-2 py-4 text-center sm:px-4">
              <p className="truncate text-[9px] font-black tracking-[0.08em] text-slate-400 sm:text-xs">
                GRID SAVINGS
              </p>
              <p className="mt-1 text-lg font-black text-amber-300 sm:text-2xl">
                {data.todayGridSavings != null ? `${data.todayGridSavings.toFixed(1)} kWh` : "—"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BatteryCharging size={17} className="text-emerald-300" aria-hidden="true" />
                  <span className="text-sm font-black text-slate-200">البطارية</span>
                </div>
                <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs font-black text-emerald-300">
                  {batteryStateLabel(state)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${discharging ? "bg-sky-400" : "bg-emerald-400"}`}
                  style={{ width: `${clamp(data.batterySoc, 0, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-400">
                <span>{Math.round(clamp(data.batterySoc, 0, 100))}%</span>
                <span>{kw(data.batteryPowerW)} kW</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Network size={17} className="text-orange-300" aria-hidden="true" />
                  <span className="text-sm font-black text-slate-200">الشبكة</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${
                    data.gridConnected
                      ? "bg-orange-300/10 text-orange-200"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {data.gridConnected ? "متصلة" : "مفصولة"}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-400">
                {!data.gridConnected
                  ? "لا يوجد اتصال بالشبكة حاليًا."
                  : gridImport
                    ? `سحب ${kw(data.gridPowerW)} kW من الشبكة`
                    : gridExport
                      ? `تصدير ${kw(data.gridPowerW)} kW إلى الشبكة`
                      : "لا يوجد سحب أو تصدير ملحوظ حاليًا."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
