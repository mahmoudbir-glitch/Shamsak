import { Home, Network, Sun, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel } from "@/lib/energy";

interface SolarHeroProps {
  data: EnergySnapshot | null;
}

function kw(value: number) {
  return (Math.abs(value) / 1000).toFixed(2);
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
        strokeWidth="2.5"
        strokeDasharray="8 8"
        strokeLinecap="round"
        opacity={active ? 0.85 : 0.15}
        style={active ? { animation: "dash 1.4s linear infinite" } : undefined}
      />
      {active && (
        <circle r="3.5" fill={color} className="animate-pulse">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={`M ${x1} ${y1} L ${x2} ${y2}`}
          />
        </circle>
      )}
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
  icon: ReactNode;
  tone: keyof typeof nodeTones;
}) {
  return (
    <div
      className={`relative z-20 box-border flex h-[112px] w-full max-w-[104px] flex-col items-center justify-center rounded-2xl border p-2 text-center backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:h-[154px] sm:max-w-[158px] sm:p-3 ${nodeTones[tone]}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 sm:h-11 sm:w-11">
        {icon}
      </div>
      <p className="mt-1.5 text-[9px] font-bold tracking-[0.08em] text-slate-400">{title}</p>
      <p className="mt-1 text-sm font-black text-slate-900 sm:text-xl">{value}</p>
      <p className="mt-1 text-[9px] font-bold text-slate-500">{subtitle}</p>
    </div>
  );
}

function BatteryNode({
  soc = 0,
  state,
  power,
}: {
  soc?: number;
  state: ReturnType<typeof batteryState>;
  power: number;
}) {
  const safe = Math.min(100, Math.max(0, Math.round(soc)));
  const radius = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative z-20 box-border flex h-[112px] w-full max-w-[104px] flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-white p-2 text-center text-emerald-700 shadow-[0_8px_28px_rgba(16,185,129,.10)] backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:h-[154px] sm:max-w-[158px] sm:p-3">
      <div className="relative h-[56px] w-[56px] shrink-0 sm:h-[66px] sm:w-[66px]" aria-label={`نسبة البطارية ${safe}%`}>
        <svg className="-rotate-90 h-full w-full" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - safe / 100)}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900 sm:text-base">
          {safe}%
        </span>
      </div>
      <p className="mt-1.5 text-[9px] font-bold tracking-[0.08em] text-slate-400">البطارية</p>
      <p className="mt-0.5 max-w-full truncate text-[9px] font-bold text-slate-600">
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
  const homeActive = data.homePowerW > 50;
  const batteryActive = charging || discharging;

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

      <div className="relative overflow-hidden bg-white px-3 py-6 sm:px-6 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(37,99,235,.045),transparent_38%),radial-gradient(circle_at_50%_0%,rgba(245,158,11,.055),transparent_28%)]" />
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

          <div className="mx-auto box-border grid w-full max-w-[820px] grid-cols-[minmax(0,1fr)_16px_minmax(104px,158px)_16px_minmax(0,1fr)] grid-rows-[auto_38px_auto_38px_auto] items-center justify-items-center gap-1 overflow-visible sm:grid-cols-[minmax(158px,1fr)_78px_minmax(110px,1fr)_78px_minmax(158px,1fr)] sm:grid-rows-[auto_78px_auto_78px_auto] sm:gap-3">
            <div className="col-start-3 row-start-1">
              <Node
                tone="solar"
                title="SOLAR"
                value={`${kw(data.solarPowerW)} kW`}
                subtitle={solarActive ? "إنتاج حالي" : "لا إنتاج حاليًا"}
                icon={<Sun size={25} aria-hidden="true" />}
              />
            </div>

            <div className="col-start-3 row-start-2 flex h-full w-full items-center justify-center">
              <FlowLine direction="down" active={solarActive} color="#d97706" />
            </div>

            <div className="col-start-1 row-start-3 flex w-full justify-end">
              <Node
                tone="grid"
                title="GRID"
                value={data.gridConnected ? `${kw(data.gridPowerW)} kW` : "مفصولة"}
                subtitle={
                  !data.gridConnected
                    ? "الشبكة غير متاحة"
                    : gridImport
                      ? "سحب من الشبكة"
                      : gridExport
                        ? "تصدير للشبكة"
                        : "متوازنة"
                }
                icon={<Network size={22} aria-hidden="true" />}
              />
            </div>

            <div className="col-start-2 row-start-3 flex h-full w-full items-center justify-center">
              <FlowLine
                direction={gridExport ? "left" : "right"}
                active={gridImport || gridExport}
                color="#8b5cf6"
              />
            </div>

            <div className="col-start-3 row-start-3">
              <div
                className="z-30 flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-slate-900 text-white shadow-xl ring-4 ring-slate-100"
                aria-label="مركز تدفق الطاقة"
              >
                <Zap size={20} className="text-amber-400" aria-hidden="true" />
              </div>
            </div>

            <div className="col-start-4 row-start-3 flex h-full w-full items-center justify-center">
              <FlowLine direction="right" active={homeActive} color="#0ea5e9" />
            </div>

            <div className="col-start-5 row-start-3 flex w-full justify-start">
              <Node
                tone="home"
                title="HOME"
                value={`${kw(data.homePowerW)} kW`}
                subtitle={homeActive ? "استهلاك حالي" : "لا استهلاك حاليًا"}
                icon={<Home size={22} aria-hidden="true" />}
              />
            </div>

            <div className="col-start-3 row-start-4 flex h-full w-full items-center justify-center">
              <FlowLine
                direction={charging ? "down" : "up"}
                active={batteryActive}
                color="#10b981"
              />
            </div>

            <div className="col-start-3 row-start-5">
              <BatteryNode soc={data.batterySoc} state={state} power={data.batteryPowerW} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
              <p className="text-[10px] font-bold text-amber-700">إنتاج اليوم</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {data.todayProductionKWh != null ? `${data.todayProductionKWh.toFixed(1)} kWh` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3">
              <p className="text-[10px] font-bold text-sky-700">استهلاك المنزل اليوم</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {data.todayHomeUsageKWh != null ? `${data.todayHomeUsageKWh.toFixed(1)} kWh` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-[10px] font-bold text-emerald-700">التوفير من الشبكة</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {data.todayGridSavings != null ? `${data.todayGridSavings.toFixed(1)} kWh` : "—"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-700">حالة البطارية</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {batteryStateLabel(state)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, data.batterySoc))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{Math.round(Math.min(100, Math.max(0, data.batterySoc)))}%</span>
                <span>{Math.abs(data.batteryPowerW / 1000).toFixed(2)} kW</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-700">الشبكة</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    data.gridConnected
                      ? "bg-violet-50 text-violet-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {data.gridConnected ? "متصلة" : "مفصولة"}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">
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
