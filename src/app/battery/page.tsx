"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BatteryCharging, Clock, Gauge, Loader2, Thermometer, Zap } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { batteryState, batteryStateLabel, batteryTone, semanticText } from "@/lib/energy";
import { PageHeader } from "@/components/page-header";

const REFRESH_MS = 15_000;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type BatterySettings = { batteryCapacityWh: number; batteryMinReservePct: number };

/** تقدير الوقت المتبقي حتى الاكتمال أو حتى حدّ الاحتياطي، من السعة والقدرة الحالية. */
function estimate(soc: number, powerW: number, settings: BatterySettings | null) {
  if (!settings || Math.abs(powerW) < 50) return null;
  const capacity = settings.batteryCapacityWh;
  const charging = powerW > 0;
  const energyWh = charging ? ((100 - soc) / 100) * capacity : (Math.max(0, soc - settings.batteryMinReservePct) / 100) * capacity;
  if (!charging && energyWh <= 0) return { charging, label: "عند حد الاحتياطي" };
  const hours = energyWh / Math.abs(powerW);
  if (!Number.isFinite(hours)) return null;
  const minutes = Math.round(hours * 60);
  const label = hours > 48 ? "أكثر من 48 ساعة" : minutes < 1 ? "أقل من دقيقة" : `${Math.floor(minutes / 60)} ساعة و${minutes % 60} دقيقة`;
  return { charging, label };
}

/** بطاقة قياس صغيرة: أيقونة + قيمة + اسم القياس. */
function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="energy-card flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{label}</div><div className="truncate text-lg font-black text-slate-900">{value}</div></div>
    </div>
  );
}

export default function BatteryPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [settings, setSettings] = useState<BatterySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/telemetry", { cache: "no-store" });
      if (!response.ok) throw new Error("telemetry_unavailable");
      const data = (await response.json()) as EnergySnapshot;
      if (data.source !== "live") throw new Error("not_live");
      setSnapshot(data);
    } catch {
      // نُبقي آخر قراءة صحيحة ظاهرة بدل استبدالها بأرقام تجريبية.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/settings", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.batteryCapacityWh) setSettings({ batteryCapacityWh: d.batteryCapacityWh, batteryMinReservePct: d.batteryMinReservePct ?? 20 }); }).catch(() => {});
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const soc = Math.min(100, Math.max(0, snapshot?.batterySoc ?? 0));
  const powerW = snapshot?.batteryPowerW ?? 0;
  const state = batteryState(powerW);
  const toneText = semanticText[batteryTone(soc)];
  const eta = snapshot ? estimate(soc, powerW, settings) : null;

  return (
    <div className="w-full space-y-3 pb-4 text-right" dir="rtl">
      <PageHeader icon={BatteryCharging} tone="emerald" eyebrow="شمسك • البطارية" title="حالة البطارية" subtitle="الشحن والجهد والحرارة والوقت المتوقع." />

      {/* مؤشر دائري كبير لنسبة الشحن */}
      <section className="energy-card flex flex-col items-center p-6">
        {loading && !snapshot ? (
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" aria-label="جاري تحميل القراءة" />
        ) : (
          <>
            <div className="relative h-48 w-48">
              <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" role="img" aria-label={"نسبة الشحن " + Math.round(soc) + "٪"}>
                <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100" />
                <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" className={toneText + " transition-all duration-700"} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - soc / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={"text-4xl font-black " + toneText}>{snapshot ? Math.round(soc) + "%" : "—"}</span>
                <span className="mt-1 text-xs font-bold text-slate-400">{snapshot ? batteryStateLabel(state) : "لا توجد قراءة"}</span>
              </div>
            </div>
            {snapshot && <p className="mt-3 text-sm font-bold text-slate-500">{Math.abs(powerW).toLocaleString("ar-LB-u-nu-latn")} واط</p>}
          </>
        )}
      </section>

      {/* بطاقات القياسات */}
      <div className="grid grid-cols-2 gap-3">
        <Metric icon={Zap} label="الجهد" value={snapshot?.batteryVoltage != null ? snapshot.batteryVoltage.toFixed(1) + " فولت" : "—"} />
        <Metric icon={Gauge} label="التيار" value={snapshot?.batteryCurrent != null ? snapshot.batteryCurrent.toFixed(1) + " أمبير" : "—"} />
        <Metric icon={Thermometer} label="الحرارة" value={snapshot?.batteryTemperature != null ? snapshot.batteryTemperature.toFixed(1) + "°م" : "—"} />
        <Metric icon={Clock} label={eta ? (eta.charging ? "اكتمال الشحن بعد" : "الوقت المتبقي") : "الوقت المتوقع"} value={eta ? eta.label : "—"} />
      </div>
      {eta && <p className="px-1 text-[11px] font-semibold text-slate-400">التقدير تقريبي: يُحسب من السعة المحفوظة في الإعدادات والقدرة الحالية، ويتغير مع تغيّر الحمل.</p>}

      {!snapshot && !loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">لا توجد قراءة حية متاحة حاليًا.</div>
      )}
    </div>
  );
}
