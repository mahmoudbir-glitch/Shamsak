import Image from "next/image";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BatteryCharging, BatteryFull, Home, Network, Sun, Zap } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel, gridLabel } from "@/lib/energy";

type SolarHeroProps = {
  data: EnergySnapshot | null;
};

function kw(w: number) {
  return (Math.abs(w) / 1000).toFixed(2);
}

function FlowArrow({ direction = "right" }: { direction?: "right" | "left" | "up" | "down" }) {
  const Icon = direction === "left" ? ArrowLeft : direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : ArrowRight;
  return <Icon aria-hidden="true" size={18} className="animate-pulse" />;
}

export function SolarHero({ data }: SolarHeroProps) {
  const battery = data ? batteryState(data.batteryPowerW) : "idle";
  const batteryLabel = data ? batteryStateLabel(battery) : "جارٍ التحميل";
  const gridStatus = data ? gridLabel(data.gridPowerW, data.gridConnected) : "جارٍ التحميل";
  const gridDirection = data && data.gridPowerW < -50 ? "تصدير" : "سحب";
  const solarActive = Boolean(data && data.solarPowerW > 50);
  const batteryActive = Boolean(data && Math.abs(data.batteryPowerW) > 50);

  return (
    <section aria-labelledby="solar-hero-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 pb-3 sm:p-5">
        <h2 id="solar-hero-title" className="text-xl font-extrabold tracking-tight text-slate-900">
          <span aria-hidden="true" className="me-1">☀️</span>شمسك
        </h2>
        <p className="mt-1 text-sm text-slate-500">إدارة ومراقبة الطاقة الشمسية</p>
      </div>

      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="relative w-full overflow-hidden rounded-2xl bg-slate-50">
          <Image
            src="/images/shamsak-energy-dashboard.jpg"
            alt="مخطط شمسك لتدفق الطاقة بين الشمس والشبكة والمنزل والبطارية"
            width={1080}
            height={1920}
            priority
            className="h-auto w-full object-contain"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1100px"
          />

          <div className="absolute inset-0 p-3 sm:p-5" aria-live="polite">
            <div className="flex h-full flex-col justify-between">
              <div className="flex justify-center">
                <div className="min-w-[125px] rounded-2xl border border-amber-200 bg-white/95 px-3 py-2 text-center shadow-lg backdrop-blur">
                  <Sun aria-hidden="true" className="mx-auto text-amber-500" size={24} />
                  <p className="text-[11px] font-bold text-slate-500">إنتاج الشمس</p>
                  <p className="text-lg font-extrabold text-amber-700">{data ? kw(data.solarPowerW) : "—"} <span className="text-xs">kW</span></p>
                  <p className="text-[10px] font-bold text-slate-500">{data ? (solarActive ? "إنتاج فعّال" : "إنتاج منخفض") : "جارٍ التحميل"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-200 bg-white/95 p-2.5 text-center shadow-lg backdrop-blur">
                  <Network aria-hidden="true" className="mx-auto text-blue-600" size={22} />
                  <p className="text-[10px] font-bold text-slate-500">الشبكة</p>
                  <p className={`text-sm font-extrabold ${data?.gridConnected ? "text-blue-700" : "text-red-600"}`}>{data ? (data.gridConnected ? "متصلة" : "مفصولة") : "—"}</p>
                  <p className="text-[10px] text-slate-500">{data ? `${gridDirection} ${kw(data.gridPowerW)} kW` : "—"}</p>
                </div>

                <div className="order-first flex justify-center text-amber-600 sm:order-none">
                  {solarActive ? <FlowArrow direction="down" /> : <Zap aria-hidden="true" size={20} />}
                </div>

                <div className="rounded-2xl border border-blue-200 bg-white/95 p-2.5 text-center shadow-lg backdrop-blur">
                  <Home aria-hidden="true" className="mx-auto text-blue-600" size={22} />
                  <p className="text-[10px] font-bold text-slate-500">المنزل</p>
                  <p className="text-lg font-extrabold text-blue-700">{data ? kw(data.homePowerW) : "—"} <span className="text-xs">kW</span></p>
                  <p className="text-[10px] font-bold text-slate-500">استهلاك حالي</p>
                </div>
              </div>

              <div className="flex justify-center">
                <div className={`min-w-[145px] rounded-2xl border bg-white/95 px-3 py-2 text-center shadow-lg backdrop-blur ${battery === "charging" ? "border-emerald-300" : battery === "discharging" ? "border-orange-300" : "border-slate-200"}`}>
                  {battery === "charging" ? <BatteryCharging aria-hidden="true" className="mx-auto text-emerald-600" size={24} /> : <BatteryFull aria-hidden="true" className="mx-auto text-emerald-600" size={24} />}
                  <p className="text-[11px] font-bold text-slate-500">البطارية</p>
                  <p className="text-lg font-extrabold text-emerald-700">{data ? data.batterySoc : "—"}<span className="text-xs">%</span></p>
                  <p className="text-[10px] font-bold text-slate-500">{batteryLabel}{data && batteryActive ? ` • ${kw(data.batteryPowerW)} kW` : ""}</p>
                  {batteryActive && <div className="mt-1 flex justify-center text-emerald-600"><FlowArrow direction={battery === "charging" ? "down" : "up"} /></div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2" aria-label="ملخص الطاقة اليوم">
          <div className="rounded-xl bg-slate-50 p-2.5 text-center">
            <p className="text-[10px] font-bold text-slate-500">إنتاج اليوم</p>
            <p className="text-sm font-extrabold text-slate-900">{data?.todayProductionKWh != null ? `${data.todayProductionKWh.toFixed(1)} kWh` : "—"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 text-center">
            <p className="text-[10px] font-bold text-slate-500">استهلاك اليوم</p>
            <p className="text-sm font-extrabold text-slate-900">{data?.todayHomeUsageKWh != null ? `${data.todayHomeUsageKWh.toFixed(1)} kWh` : "—"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 text-center">
            <p className="text-[10px] font-bold text-slate-500">توفير الشبكة</p>
            <p className="text-sm font-extrabold text-emerald-700">{data?.todayGridSavings != null ? `${data.todayGridSavings.toFixed(1)} kWh` : "—"}</p>
          </div>
        </div>

        {data && (
          <p className="mt-2 text-center text-[10px] text-slate-400">
            {data.source === "demo" ? "Demo — بيانات تجريبية" : "Live — بيانات حية"} · آخر قراءة: {new Date(data.timestamp).toLocaleTimeString("ar-LB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </section>
  );
}
