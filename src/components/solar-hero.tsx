import {
  BatteryCharging,
  BatteryFull,
  Home,
  Info,
  Network,
  Sun,
  Zap,
} from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel, gridLabel } from "@/lib/energy";

interface SolarHeroProps {
  data: EnergySnapshot | null;
}

function watts(value: number) {
  return `${Math.round(Math.abs(value)).toLocaleString("ar-LB")} واط`;
}

function NodeCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative z-20 w-full max-w-[150px] rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:max-w-[170px] sm:p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function ConnectorLines() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="solar-flow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="grid-flow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="home-flow" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="battery-flow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <line x1="50" y1="28" x2="50" y2="42" stroke="url(#solar-flow)" strokeWidth="0.7" strokeDasharray="2 1.5" />
      <line x1="28" y1="50" x2="42" y2="50" stroke="url(#grid-flow)" strokeWidth="0.7" strokeDasharray="2 1.5" />
      <line x1="58" y1="50" x2="72" y2="50" stroke="url(#home-flow)" strokeWidth="0.7" strokeDasharray="2 1.5" />
      <line x1="50" y1="58" x2="50" y2="72" stroke="url(#battery-flow)" strokeWidth="0.7" strokeDasharray="2 1.5" />
      <circle cx="50" cy="50" r="4.2" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <circle cx="50" cy="50" r="3" fill="#0f172a" />
    </svg>
  );
}

export function SolarHero({ data }: SolarHeroProps) {
  if (!data) {
    return (
      <section
        aria-label="شمسك - تدفق الطاقة"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex min-h-[360px] items-center justify-center bg-slate-50 p-6">
          <div className="text-center">
            <Sun className="mx-auto text-amber-500" size={32} aria-hidden="true" />
            <p className="mt-3 font-bold text-slate-700">جارٍ تحميل بيانات الطاقة…</p>
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
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sun className="text-amber-500" size={22} aria-hidden="true" />
            <div>
              <h2 id="solar-hero-title" className="text-xl font-black text-slate-900">
                شمسك
              </h2>
              <p className="text-xs font-semibold text-slate-500">إدارة ومراقبة الطاقة الشمسية</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            الشمس أولاً ✓
          </span>
        </div>
      </div>

      <div className="bg-slate-50/70 px-3 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto mb-3 flex max-w-[560px] justify-end">
          <span className="text-xs font-bold text-slate-500">
            {data.source === "demo" ? "Demo — بيانات تجريبية" : "Live — بيانات حية"}
          </span>
        </div>

        <div className="relative mx-auto grid min-h-[500px] max-w-[620px] grid-cols-[1fr_72px_1fr] grid-rows-[1fr_72px_1fr] items-center justify-items-center gap-2 sm:min-h-[570px] sm:grid-cols-[1fr_96px_1fr] sm:grid-rows-[1fr_96px_1fr] sm:gap-3">
          <ConnectorLines />

          <div className="col-start-2 row-start-1">
            <NodeCard className="border-amber-200">
              <Sun className="mx-auto text-amber-500" size={24} aria-hidden="true" />
              <p className="mt-1 text-xs font-bold text-slate-500">الشمس</p>
              <p className="mt-1 text-base font-black text-slate-900 sm:text-lg">
                {watts(data.solarPowerW)}
              </p>
              <p className={`mt-1 text-[10px] font-bold ${solarActive ? "text-amber-600" : "text-slate-400"}`}>
                {solarActive ? "إنتاج حالي" : "لا إنتاج حاليًا"}
              </p>
            </NodeCard>
          </div>

          <div className="col-start-1 row-start-2 justify-self-end">
            <NodeCard className="border-violet-200">
              <Network className={data.gridConnected ? "mx-auto text-violet-600" : "mx-auto text-slate-400"} size={24} aria-hidden="true" />
              <p className="mt-1 text-xs font-bold text-slate-500">الشبكة</p>
              <p className={`mt-1 text-sm font-black ${data.gridConnected ? "text-violet-700" : "text-slate-500"}`}>
                {data.gridConnected ? "متصلة" : "مقطوعة"}
              </p>
              <p className="mt-1 text-[10px] font-bold text-slate-500">
                {!data.gridConnected
                  ? "لا يوجد اتصال"
                  : gridImport
                    ? `سحب ${watts(data.gridPowerW)}`
                    : gridExport
                      ? `تصدير ${watts(data.gridPowerW)}`
                      : gridLabel(data.gridPowerW, true)}
              </p>
            </NodeCard>
          </div>

          <div className="col-start-3 row-start-2 justify-self-start">
            <NodeCard className="border-blue-200">
              <Home className="mx-auto text-blue-600" size={24} aria-hidden="true" />
              <p className="mt-1 text-xs font-bold text-slate-500">المنزل</p>
              <p className="mt-1 text-base font-black text-slate-900 sm:text-lg">
                {watts(data.homePowerW)}
              </p>
              <p className="mt-1 text-[10px] font-bold text-blue-600">استهلاك حالي</p>
            </NodeCard>
          </div>

          <div className="col-start-2 row-start-3">
            <NodeCard className={charging ? "border-emerald-200" : discharging ? "border-blue-200" : "border-slate-200"}>
              {charging ? (
                <BatteryCharging className="mx-auto text-emerald-600" size={25} aria-hidden="true" />
              ) : (
                <BatteryFull className={discharging ? "mx-auto text-blue-600" : "mx-auto text-emerald-600"} size={25} aria-hidden="true" />
              )}
              <p className="mt-1 text-xs font-bold text-slate-500">البطارية</p>
              <p className="mt-1 text-base font-black text-slate-900 sm:text-lg">{data.batterySoc}%</p>
              <p className={`mt-1 text-[10px] font-bold ${charging ? "text-emerald-700" : discharging ? "text-blue-700" : "text-slate-500"}`}>
                {batteryStateLabel(state)} • {watts(data.batteryPowerW)}
              </p>
            </NodeCard>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <BatteryCharging className="text-emerald-600" size={21} aria-hidden="true" />
          <h3 className="font-black text-slate-900">البطارية</h3>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`شحن البطارية ${data.batterySoc}%`}>
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, data.batterySoc))}%` }}
          />
        </div>

        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
          <BatteryDetail label="شحن البطارية" value={`${data.batterySoc}%`} />
          <BatteryDetail label="الحالة" value={`${batteryStateLabel(state)} • ${watts(data.batteryPowerW)}`} />
          <BatteryDetail label="جهد البطارية" value={data.batteryVoltage == null ? "—" : `${data.batteryVoltage.toFixed(1)} فولت`} />
        </div>
      </div>
    </section>
  );
}

function BatteryDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 px-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Info size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-500">{label}</span>
      </div>
      <strong className="shrink-0 text-sm font-black text-slate-900">{value}</strong>
    </div>
  );
}

export default SolarHero;
