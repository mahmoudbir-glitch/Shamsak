import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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

function kw(value: number) {
  return (Math.abs(value) / 1000).toFixed(2);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
      className="pointer-events-none h-full w-full overflow-visible"
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
        opacity={active ? 0.8 : 0.14}
        style={active ? { animation: "dash 1.4s linear infinite" } : undefined}
      />
      {active && (
        <circle r="3.2" fill={color}>
          <animateMotion
            dur="1.8s"
            repeatCount="indefinite"
            path={`M ${x1} ${y1} L ${x2} ${y2}`}
          />
        </circle>
      )}
    </svg>
  );
}

const nodeTones = {
  solar: "border-amber-200 bg-white text-amber-700 shadow-[0_10px_30px_rgba(245,158,11,.12)]",
  home: "border-sky-200 bg-white text-sky-700 shadow-[0_10px_30px_rgba(14,165,233,.10)]",
  battery:
    "border-emerald-200 bg-white text-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,.11)]",
  grid: "border-violet-200 bg-white text-violet-700 shadow-[0_10px_30px_rgba(139,92,246,.10)]",
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
      className={`relative z-20 flex h-[116px] w-full max-w-[108px] flex-col items-center justify-center rounded-2xl border p-2 text-center backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:h-[148px] sm:max-w-[158px] sm:p-3 ${nodeTones[tone]}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 sm:h-11 sm:w-11">
        {icon}
      </div>
      <p className="mt-1.5 text-[9px] font-black tracking-[0.08em] text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900 sm:text-xl">
        {value}
      </p>
      <p className="mt-1 max-w-full truncate text-[9px] font-bold text-slate-500">
        {subtitle}
      </p>
    </div>
  );}

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
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const tone =
    state === "charging"
      ? "text-emerald-600"
      : state === "discharging"
        ? "text-blue-600"
        : "text-slate-600";

  return (
    <div className="relative z-20 flex h-[116px] w-full max-w-[108px] flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-white p-2 text-center shadow-[0_10px_30px_rgba(16,185,129,.11)] sm:h-[148px] sm:max-w-[158px] sm:p-3">
      <div
        className="relative h-[56px] w-[56px] shrink-0 sm:h-[66px] sm:w-[66px]"
        aria-label={`نسبة البطارية ${safe}%`}
      >
        <svg className="-rotate-90 h-full w-full" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={state === "discharging" ? "#3b82f6" : "#10b981"}
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
      <p className="mt-1.5 text-[9px] font-black tracking-[0.08em] text-slate-400">
        البطارية
      </p>
      <p className={`mt-0.5 max-w-full truncate text-[9px] font-bold ${tone}`}>
        {batteryStateLabel(state)} · {kw(power)} kW
      </p>
    </div>
  );
}

function FlowStatus({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2 ${tone}`}>
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500">{label}</p>
        <p className="truncate text-xs font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export function SolarHero({ data }: SolarHeroProps) {
  if (!data) {
    return (
      <section
        aria-label="شمسك - تدفق الطاقة"
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_45px_rgba(15,23,42,.08)]"
      >
        <div className="flex min-h-[430px] items-center justify-center p-6">
          <div className="text-center" role="status" aria-live="polite">
            <Sun className="mx-auto animate-pulse text-amber-500" size={38} aria-hidden="true" />
            <p className="mt-3 font-black text-slate-800">جارٍ تحميل بيانات الطاقة…</p>
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
  const batteryActive = charging || discharging;
  const netSolarAfterLoad = data.solarPowerW - data.homePowerW;
  const statusText = !data.gridConnected
    ? "الشبكة مفصولة"
    : gridExport
      ? "يوجد فائض يُصدّر للشبكة"
      : gridImport
        ? "المنزل يسحب من الشبكة"
        : charging
          ? "الشمس تشحن البطارية"
          : discharging
            ? "البطارية تدعم المنزل"
            : "تدفق الطاقة متوازن";

  return (
    <section
      aria-labelledby="solar-hero-title"      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,.09)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-sm">
            <Sun size={24} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="solar-hero-title" className="text-xl font-black text-slate-900">
              شمسك
            </h2>
            <p className="truncate text-xs font-semibold text-slate-500">
              إدارة ومراقبة الطاقة الشمسية
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black ${data.source === "demo"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {data.source === "demo" ? "Demo" : "Live"}
        </span>
      </header>

      <div className="relative overflow-hidden bg-gradient-to-b from-slate-50/80 to-white px-3 py-5 sm:px-6 sm:py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 50% 42%, rgba(37,99,235,.055), transparent 34%), radial-gradient(circle at 50% 0%, rgba(245,158,11,.08), transparent 28%)",
          }}
        />

        <div className="relative mx-auto max-w-[920px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.10)]" />
              <span className="text-xs font-bold text-slate-600">حالة النظام الآن</span>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-black ${!data.gridConnected
                ? "bg-slate-200 text-slate-600"
                : "bg-amber-50 text-amber-700"}`}
              aria-live="polite"
            >
              {statusText}
            </span>
          </div>

          <div className="mx-auto grid w-full max-w-[820px] grid-cols-[minmax(0,1fr)_14px_minmax(104px,150px)_14px_minmax(0,1fr)] grid-rows-[auto_34px_auto_34px_auto] items-center justify-items-center gap-1 sm:grid-cols-[minmax(158px,1fr)_70px_minmax(120px,1fr)_70px_minmax(158px,1fr)] sm:grid-rows-[auto_72px_auto_72px_auto] sm:gap-3">
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
              <FlowLine direction="down" active={solarActive} color="#f59e0b" />
            </div>

            <div className="col-start-1 row-start-3 flex w-full justify-end">
              <Node
                tone="grid"
                title="GRID"
                value={data.gridConnected ? `${kw(data.gridPowerW)} kW` : "مفصولة"}
                subtitle={
                  !data.gridConnected
                    ? "غير متاحة"
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
                className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl ring-4 ring-white sm:h-16 sm:w-16"
                aria-label="مركز تدفق الطاقة"
              >
                <Zap size={23} className={solarActive ? "text-amber-400" : "text-slate-300"} aria-hidden="true" />
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
                color={discharging ? "#3b82f6" : "#10b981"}              />
            </div>

            <div className="col-start-3 row-start-5">
              <BatteryNode soc={data.batterySoc} state={state} power={data.batteryPowerW} />
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <FlowStatus
              icon={<Sun size={15} className="text-amber-500" aria-hidden="true" />}
              label="الشمس"
              value={`${kw(data.solarPowerW)} kW إنتاج`}
              tone="border-amber-100"
            />
            <FlowStatus
              icon={<Home size={15} className="text-sky-500" aria-hidden="true" />}
              label="المنزل"
              value={`${kw(data.homePowerW)} kW استهلاك`}
              tone="border-sky-100"
            />
            <FlowStatus
              icon={<Network size={15} className="text-violet-500" aria-hidden="true" />}
              label="الشبكة"
              value={!data.gridConnected ? "مفصولة" : gridExport ? `${kw(data.gridPowerW)} kW تصدير` : gridImport ? `${kw(data.gridPowerW)} kW سحب` : "متوازنة"}
              tone="border-violet-100"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3.5">
              <p className="text-[10px] font-bold text-amber-700">إنتاج اليوم</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {data.todayProductionKWh != null ? `${data.todayProductionKWh.toFixed(1)} kWh` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5">
              <p className="text-[10px] font-bold text-sky-700">استهلاك المنزل اليوم</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {data.todayHomeUsageKWh != null ? `${data.todayHomeUsageKWh.toFixed(1)} kWh` : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5">
              <p className="text-[10px] font-bold text-emerald-700">التوفير من الشبكة</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {data.todayGridSavings != null ? `${data.todayGridSavings.toFixed(1)} kWh` : "—"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BatteryCharging size={17} className="text-emerald-600" aria-hidden="true" />
                  <span className="text-sm font-black text-slate-700">حالة البطارية</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                  {batteryStateLabel(state)}
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${discharging ? "bg-blue-500" : "bg-emerald-500"}`}
                  style={{ width: `${clamp(data.batterySoc, 0, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{Math.round(clamp(data.batterySoc, 0, 100))}%</span>
                <span>{kw(data.batteryPowerW)} kW</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Network size={17} className="text-violet-600" aria-hidden="true" />
                  <span className="text-sm font-black text-slate-700">الشبكة</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${data.gridConnected
                    ? "bg-violet-50 text-violet-700"
                    : "bg-slate-200 text-slate-600"}`}
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <Zap size={14} className="text-amber-500" aria-hidden="true" />
              <span>صافي الشمس بعد استهلاك المنزل</span>
            </div>
            <strong className={netSolarAfterLoad >= 0 ? "text-emerald-700" : "text-blue-700"}>
              {netSolarAfterLoad >= 0 ? "+" : "-"}{kw(netSolarAfterLoad)} kW
            </strong>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1"><ArrowDown size={12} /> الشمس → البطارية عند الشحن</span>
            <span className="inline-flex items-center gap-1"><ArrowUp size={12} /> البطارية → المنزل عند التفريغ</span>
            <span className="inline-flex items-center gap-1"><ArrowLeft size={12} /> التصدير → الشبكة</span>
            <span className="inline-flex items-center gap-1"><ArrowRight size={12} /> السحب ← الشبكة</span>
          </div>
        </div>
      </div>
    </section>
  );
}