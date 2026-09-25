import {
  BatteryCharging,
  Home,
  Network,
  Sun,
  Zap,
  ArrowDownToLine,
  ArrowUpFromLine,
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

const tone: Record<FlowTone, {
  text: string;
  border: string;
  icon: string;
  soft: string;
}> = {
  solar: {
    text: "text-amber-600",
    border: "border-amber-300",
    icon: "bg-amber-50 text-amber-500",
    soft: "bg-amber-50",
  },
  grid: {
    text: "text-violet-600",
    border: "border-violet-200",
    icon: "bg-violet-50 text-violet-600",
    soft: "bg-violet-50",
  },
  home: {
    text: "text-sky-600",
    border: "border-sky-200",
    icon: "bg-sky-50 text-sky-600",
    soft: "bg-sky-50",
  },
  battery: {
    text: "text-emerald-600",
    border: "border-emerald-200",
    icon: "bg-emerald-50 text-emerald-600",
    soft: "bg-emerald-50",
  },
};

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
    <div className="relative z-20 flex w-[112px] flex-col items-center text-center sm:w-[160px]">
      <div
        className={[
          "flex h-[72px] w-[72px] items-center justify-center rounded-[22px]",
          "border-2 bg-white shadow-lg shadow-slate-200/70 sm:h-[100px] sm:w-[100px]",
          t.border,
        ].join(" ")}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${t.icon}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-[10px] font-black tracking-[0.08em] text-slate-700 sm:text-xs">{title}</p>
      <p className={`mt-1 text-xl font-black tracking-tight sm:text-3xl ${t.text}`}>{value}</p>
      <p className="mt-0.5 max-w-[150px] text-[10px] font-semibold text-slate-600 sm:text-xs">{subtitle}</p>
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
  const discharging = state === "discharging";

  return (
    <div className="relative z-20 flex w-[140px] flex-col items-center text-center sm:w-[180px]">
      <div className="relative flex h-[112px] w-[112px] items-center justify-center rounded-[28px] border-2 border-emerald-200 bg-white shadow-lg shadow-slate-200/70 sm:h-[132px] sm:w-[132px]">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r="31" fill="none" stroke="#e2e8f0" strokeWidth="4.5" />
          <circle
            cx="36"
            cy="36"
            r="31"
            fill="none"
            stroke={discharging ? "#0ea5e9" : "#10b981"}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - safe / 100)}
            className="transition-all duration-700"
          />
        </svg>
        <div className="relative">
          <p className="text-2xl font-black text-slate-800 sm:text-3xl">{safe}%</p>
          <BatteryCharging
            size={16}
            className={discharging ? "mx-auto mt-1 text-sky-500" : "mx-auto mt-1 text-emerald-500"}
            aria-hidden="true"
          />
        </div>
      </div>
      <p className="mt-2 text-[10px] font-black tracking-[0.08em] text-slate-500 sm:text-xs">حالة البطارية</p>
      <p className={`mt-1 text-lg font-black sm:text-2xl ${discharging ? "text-sky-600" : "text-emerald-600"}`}>
        {kw(power)} kW
      </p>
      <p className={`text-xs font-bold ${state === "charging" ? "text-emerald-600" : discharging ? "text-sky-600" : "text-slate-500"}`}>
        {batteryStateLabel(state)}
      </p>
    </div>
  );
}

type FlowPath = {
  id: string;
  d: string;
  color: string;
  active: boolean;
  marker: string;
};

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
  /*
   * The map deliberately uses an orthogonal (+) geometry:
   * solar -> center -> battery is the vertical trunk and
   * grid -> center -> home is the horizontal trunk.
   *
   * Four independent outer arcs show the possible circular energy
   * routes without forcing a diagonal X through the central hub.
   */
  const paths: FlowPath[] = [
    { id: "solar-center", d: "M50 25 L50 50", color: "#f59e0b", active: solarActive, marker: "arrow-amber" },
    { id: "center-home", d: "M50 50 L80 50", color: "#0ea5e9", active: homeActive, marker: "arrow-sky" },
    { id: "center-grid", d: "M50 50 L20 50", color: "#8b5cf6", active: gridActive && !gridExport, marker: "arrow-violet" },
    { id: "center-battery-charge", d: "M50 50 L50 76", color: "#10b981", active: charging, marker: "arrow-emerald" },
    { id: "battery-center-discharge", d: "M50 76 L50 50", color: "#0ea5e9", active: discharging, marker: "arrow-sky" },
    { id: "solar-home", d: "M55 20 C73 20 87 30 87 45 L87 47", color: "#f59e0b", active: solarActive && homeActive, marker: "arrow-amber" },
    { id: "home-battery", d: "M87 55 C87 72 72 82 55 82", color: "#0ea5e9", active: discharging, marker: "arrow-sky" },
    { id: "battery-grid", d: "M45 82 C28 82 13 72 13 55", color: "#8b5cf6", active: gridActive && gridExport, marker: "arrow-violet" },
    { id: "grid-solar", d: "M13 47 C13 30 27 20 45 20", color: "#8b5cf6", active: gridActive && !gridExport, marker: "arrow-violet" },
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <filter id="energy-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <marker id="arrow-amber" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#f59e0b" />
        </marker>
        <marker id="arrow-violet" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#8b5cf6" />
        </marker>
        <marker id="arrow-sky" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#0ea5e9" />
        </marker>
        <marker id="arrow-emerald" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#10b981" />
        </marker>
      </defs>

      {paths.map((path) => (
        <g key={path.id}>
          <path
            d={path.d}
            fill="none"
            stroke={path.color}
            strokeWidth={path.active ? "0.95" : "0.5"}
            strokeDasharray={path.active ? "2.8 2" : "1.5 3.5"}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={path.active ? 0.9 : 0.14}
            markerEnd={path.active ? `url(#${path.marker})` : undefined}
            filter={path.active ? "url(#energy-glow)" : undefined}
          />
          {path.active && (
            <circle r="1.05" fill={path.color} filter="url(#energy-glow)">
              <animateMotion dur="1.5s" repeatCount="indefinite" path={path.d} />
            </circle>
          )}
        </g>
      ))}

      <circle cx="50" cy="50" r="4.8" fill="white" stroke="#cbd5e1" strokeWidth="0.65" />
      <circle cx="50" cy="50" r="3.5" fill="white" stroke="#e2e8f0" strokeWidth="0.5" />
    </svg>
  );
}

function Stat({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: string;
  toneClass: string;
}) {
  return (
    <div className="min-w-0 px-2 py-4 text-center sm:px-4">
      <p className="truncate text-[9px] font-black tracking-[0.06em] text-slate-400 sm:text-xs">{label}</p>
      <p className={`mt-1 text-lg font-black sm:text-2xl ${toneClass}`}>{value}</p>
    </div>
  );
}

export function SolarHero({ data }: SolarHeroProps) {
  if (!data) {
    return (
      <section aria-label="شمسك — تدفق الطاقة" className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
        <div className="flex min-h-[520px] items-center justify-center p-6">
          <div className="text-center" role="status" aria-live="polite">
            <Sun className="mx-auto animate-pulse text-amber-500" size={42} aria-hidden="true" />
            <p className="mt-4 font-black text-slate-800">جارٍ تحميل بيانات الطاقة…</p>
            <p className="mt-1 text-xs text-slate-500">يتم تجهيز مخطط التدفق اللحظي</p>
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
    <section aria-labelledby="solar-hero-title" className="overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-200/70">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-500">
            <Sun size={24} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="solar-hero-title" className="text-xl font-black text-slate-900">شمسك</h2>
            <p className="truncate text-xs font-semibold text-slate-500">إدارة ومراقبة الطاقة الشمسية</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black ${data.source === "demo" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {data.source === "demo" ? "DEMO" : "LIVE"}
        </span>
      </header>

      <div className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/60 to-white px-3 py-5 sm:px-6 sm:py-7">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ background: "radial-gradient(circle at 50% 18%, rgba(245,158,11,.10), transparent 20%), radial-gradient(circle at 50% 58%, rgba(16,185,129,.07), transparent 28%), radial-gradient(circle at 100% 55%, rgba(14,165,233,.07), transparent 22%)" }} />

        <div className="relative mx-auto max-w-[980px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.5)]" />
              <span className="text-xs font-bold text-slate-800">حالة النظام الآن</span>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-700 shadow-sm">{statusText}</span>
          </div>

          <div className="relative mx-auto mt-3 aspect-[0.82] w-full max-w-[620px] sm:aspect-square sm:max-w-[780px]">
            <FlowMap
              solarActive={solarActive}
              homeActive={homeActive}
              gridActive={gridActive}
              batteryActive={charging || discharging}
              charging={charging}
              discharging={discharging}
              gridExport={gridExport}
            />

            <div className="absolute left-1/2 top-[3%] z-20 -translate-x-1/2">
              <EnergyNode variant="solar" title="الشمس" value={`${kw(data.solarPowerW)} kW`} subtitle={solarActive ? "إنتاج حالي" : "لا إنتاج حاليًا"} icon={<Sun size={34} aria-hidden="true" />} />
            </div>

            <div className="absolute left-[1%] top-[45%] z-20">
              <EnergyNode
                variant="grid"
                title="الشبكة"
                value={!data.gridConnected ? "مفصولة" : `${kw(data.gridPowerW)} kW`}
                subtitle={!data.gridConnected ? "لا يوجد اتصال" : gridImport ? "سحب من الشبكة" : gridExport ? "تصدير إلى الشبكة" : "متوازنة"}
                icon={<Network size={32} aria-hidden="true" />}
              />
            </div>

            <div className="absolute right-[1%] top-[45%] z-20">
              <EnergyNode variant="home" title="المنزل" value={`${kw(data.homePowerW)} kW`} subtitle={homeActive ? "استهلاك حالي" : "لا استهلاك حاليًا"} icon={<Home size={32} aria-hidden="true" />} />
            </div>

            <div className="absolute bottom-[2%] left-1/2 z-20 -translate-x-1/2">
              <BatteryNode soc={data.batterySoc} state={state} power={data.batteryPowerW} />
            </div>

            <div className="absolute left-1/2 top-[47%] z-20 -translate-x-1/2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg shadow-slate-200/70 ring-4 ring-white sm:h-20 sm:w-20">
                <Zap size={28} className={solarActive ? "text-amber-500" : "text-slate-400"} aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-l border-slate-100">
              <Stat label="إنتاج اليوم" value={data.todayProductionKWh != null ? `${data.todayProductionKWh.toFixed(1)} kWh` : "—"} toneClass="text-emerald-600" />
            </div>
            <div className="border-l border-slate-100">
              <Stat label="استهلاك المنزل" value={data.todayHomeUsageKWh != null ? `${data.todayHomeUsageKWh.toFixed(1)} kWh` : "—"} toneClass="text-sky-600" />
            </div>
            <Stat label="التوفير من الشبكة" value={data.todayGridSavings != null ? `${data.todayGridSavings.toFixed(1)} kWh` : "—"} toneClass="text-amber-600" />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BatteryCharging size={17} className="text-emerald-600" aria-hidden="true" />
                  <span className="text-sm font-black text-slate-800">البطارية</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">{batteryStateLabel(state)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full transition-all duration-700 ${discharging ? "bg-sky-500" : "bg-emerald-500"}`} style={{ width: `${clamp(data.batterySoc, 0, 100)}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{Math.round(clamp(data.batterySoc, 0, 100))}%</span>
                <span>{kw(data.batteryPowerW)} kW</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Network size={17} className="text-violet-600" aria-hidden="true" />
                  <span className="text-sm font-black text-slate-800">الشبكة</span>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${data.gridConnected ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                  {data.gridConnected ? "متصلة" : "مفصولة"}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-500">
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

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold text-slate-400">
            <span className="inline-flex items-center gap-1.5"><ArrowDownToLine size={13} className="text-emerald-500" aria-hidden="true" />الشحن</span>
            <span className="inline-flex items-center gap-1.5"><ArrowUpFromLine size={13} className="text-sky-500" aria-hidden="true" />التفريغ</span>
            <span>الخطوط المتحركة = تدفق الطاقة النشط</span>
          </div>
        </div>
      </div>
    </section>
  );
}
