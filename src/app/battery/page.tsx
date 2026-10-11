"use client";

import { BatteryFlowSplit } from "@/components/energy-split";
import React, { useCallback, useEffect, useState } from "react";
import { BatteryCharging, CheckCircle2, Clock3, Gauge, Loader2, Thermometer, Zap } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { arabicDuration, batteryAmpHours, batteryAmps, batteryState, batteryStateLabel, batteryText } from "@/lib/energy";
import { AmpPill } from "@/components/amp-pill";
import { PageHeader } from "@/components/page-header";
import { SocChart } from "@/components/soc-chart";
import type { LoadPoint } from "@/components/load-chart";
import { startVisiblePolling } from "@/lib/visible-polling";

const REFRESH_MS = 15_000;
type BatterySettings = { batteryCapacityWh: number; batteryMinReservePct: number; batteryChemistry?: string | null; batteryNominalVoltage?: number };
type History = { points: LoadPoint[]; timezone: string; batteryToday: { chargeKWh: number; dischargeKWh: number } | null; socToday: { min: number; max: number } | null };

function estimate(soc: number, powerW: number, settings: BatterySettings | null) {
  if (!settings || Math.abs(powerW) < 50) return null;
  const capacity = settings.batteryCapacityWh;
  const charging = powerW > 0;
  const energyWh = charging ? ((100 - soc) / 100) * capacity : (Math.max(0, soc - settings.batteryMinReservePct) / 100) * capacity;
  if (!charging && energyWh <= 0) return { charging, label: "عند حد الاحتياطي" };
  const hours = energyWh / Math.abs(powerW);
  if (!Number.isFinite(hours)) return null;
  const minutes = Math.round(hours * 60);
  const label = hours > 48 ? "أكثر من 48 ساعة" : minutes < 1 ? "أقل من دقيقة" : arabicDuration(minutes);
  return { charging, label };
}

const CELLS = 10;
const BODY = { x: 30, width: 250, gap: 4 } as const;

function BatteryGauge({ soc, reservePct, tone, charging }: { soc: number; reservePct: number; tone: string; charging: boolean }) {
  const cell = (BODY.width - BODY.gap * (CELLS - 1)) / CELLS;
  const right = BODY.x + BODY.width;
  const reserveX = right - (reservePct / 100) * BODY.width;
  const headTone = charging ? "text-emerald-500" : soc <= reservePct ? "text-rose-500" : "text-amber-500";
  return (
    <svg viewBox="0 0 300 120" className="h-auto w-full" role="img" aria-label={`البطارية مشحونة ${Math.round(soc)}٪، والاحتياطي ${reservePct}٪`}>
      <g className={"fill-none stroke-current " + headTone} opacity={charging ? 0.95 : 0.35}>
        <path d="M10 42 A18 18 0 0 1 28 60" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 5">
          {charging && <animateTransform attributeName="transform" type="rotate" from="0 10 60" to="360 10 60" dur="2.2s" repeatCount="indefinite" />}
        </path>
        <path d="M10 78 A18 18 0 0 1 28 60" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 5">
          {charging && <animateTransform attributeName="transform" type="rotate" from="0 10 60" to="360 10 60" dur="2.2s" repeatCount="indefinite" />}
        </path>
      </g>
      <rect x="4" y="42" width="14" height="36" rx="4" className="fill-slate-300" />
      <rect x="20" y="10" width="270" height="100" rx="16" className="fill-white stroke-slate-300" strokeWidth="3" />
      {Array.from({ length: CELLS }, (_, i) => {
        const x = right - (i + 1) * cell - i * BODY.gap;
        const fill = Math.min(1, Math.max(0, soc / 10 - i));
        const width = cell * fill;
        return (
          <g key={i}>
            <rect x={x} y="20" width={cell} height="80" rx="5" className="fill-slate-100" />
            {width > 0 && <rect x={x + cell - width} y="20" width={width} height="80" rx="5" className={"fill-current motion-safe:transition-all motion-safe:duration-700 " + tone} />}
          </g>
        );
      })}
      <line x1={reserveX} x2={reserveX} y1="14" y2="106" className="stroke-rose-400" strokeWidth="2" strokeDasharray="5 4" />
      {charging && <path d="M159 30 L141 64 H154 L148 92 L169 54 H156 Z" className="fill-amber-400 stroke-white" strokeWidth="3" strokeLinejoin="round" />}
    </svg>
  );
}

function Reading({ label, value, unit, note, muted = false }: { label: string; value: string; unit?: string; note?: React.ReactNode; muted?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50/80 p-3">
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className={"mt-1 whitespace-nowrap text-xl font-black leading-7 " + (muted ? "text-slate-300" : "text-slate-900")}>
        {unit ? <bdi dir="ltr">{value}<small className="text-xs font-bold text-slate-500"> {unit}</small></bdi> : <bdi>{value}</bdi>}
      </div>
      <div className="mt-1 min-h-[20px] text-[11px] font-semibold leading-4 text-slate-400">{note}</div>
    </div>
  );
}

export default function BatteryPage() {
  const [snapshot, setSnapshot] = useState<EnergySnapshot | null>(null);
  const [settings, setSettings] = useState<BatterySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<History | null>(null);

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
    void fetch("/api/settings", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.batteryCapacityWh) setSettings({ batteryCapacityWh: d.batteryCapacityWh, batteryMinReservePct: d.batteryMinReservePct ?? 20, batteryChemistry: d.batteryChemistry, batteryNominalVoltage: d.batteryNominalVoltage }); }).catch(() => {});
    const loadHistory = () => void fetch("/api/telemetry/history", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setHistory(d as History); }).catch(() => {});
    loadHistory();
    const stopHistory = startVisiblePolling(loadHistory, 5 * 60_000);
    const stopLive = startVisiblePolling(() => void load(), REFRESH_MS);
    return () => { stopLive(); stopHistory(); };
  }, [load]);

  const soc = Math.min(100, Math.max(0, snapshot?.batterySoc ?? 0));
  const powerW = snapshot?.batteryPowerW ?? 0;
  const state = batteryState(powerW);
  const toneText = batteryText(soc);
  const eta = snapshot ? estimate(soc, powerW, settings) : null;
  const amps = snapshot ? batteryAmps(snapshot, settings?.batteryNominalVoltage) : null;
  const reservePct = settings?.batteryMinReservePct ?? 20;
  const capacityKWh = (settings?.batteryCapacityWh ?? 0) / 1000;
  const storedKWh = (soc / 100) * capacityKWh;
  const usableKWh = (Math.max(0, soc - reservePct) / 100) * capacityKWh;
  const reserveLeftPct = ((280 - (reservePct / 100) * 250) / 300) * 100;
  const statusClass = state === "charging" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : state === "discharging" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="desktop-grid w-full space-y-3 pb-5 text-right" dir="rtl">
      <PageHeader icon={BatteryCharging} tone="emerald" eyebrow="شمسك • البطارية" title="البطارية" subtitle="مراقبة الشحن والطاقة والجهد والحرارة في مكان واحد." />

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
          <div className="border-b border-slate-100 p-4 sm:p-6 lg:border-b-0 lg:border-l">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-slate-400">الحالة الحالية</div>
                <div className="mt-1 text-lg font-black text-slate-900">مستوى شحن البطارية</div>
              </div>
              {snapshot && <span className={"rounded-full border px-3 py-1.5 text-xs font-black " + statusClass}>{state === "charging" && <Zap className="ml-1 inline h-3.5 w-3.5" />}{batteryStateLabel(state)}</span>}
            </div>
            {loading && !snapshot ? <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" aria-label="جاري تحميل القراءة" /></div> : <BatteryGauge soc={soc} reservePct={reservePct} tone={toneText} charging={state === "charging"} />}
            <div className="relative mt-1 h-5 text-[10px] font-bold text-slate-400">
              <span className="absolute right-[3%]">0%</span>
              <span className="absolute -translate-x-1/2 whitespace-nowrap text-rose-500" style={{ left: `${reserveLeftPct}%` }}>الاحتياطي {reservePct}%</span>
              <span className="absolute left-[7%]">100%</span>
            </div>
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-400">نسبة الشحن</div>
                <div className={"mt-1 text-6xl font-black tracking-tight " + toneText}><bdi dir="ltr">{snapshot ? Math.round(soc) + "%" : "—"}</bdi></div>
                <div className="mt-2 text-xs font-bold text-slate-500">{!snapshot ? "لا توجد قراءة حية" : eta ? (eta.label === "عند حد الاحتياطي" ? eta.label : (eta.charging ? "تمتلئ بعد " : "تصل للاحتياطي بعد ") + eta.label) : state === "idle" ? "البطارية مستقرة الآن" : ""}</div>
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-400">القدرة الحالية</div>
                <div className="mt-1 text-2xl font-black text-slate-900"><bdi dir="ltr">{snapshot ? (Math.abs(powerW) / 1000).toFixed(2) : "—"}<small className="text-xs text-slate-500"> kW</small></bdi></div>
                <div className="mt-1"><AmpPill tone="emerald" amps={amps} muted={Math.abs(powerW) < 50} /></div>
              </div>
            </div>

            {settings && snapshot && <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-500">المخزّن الآن</div><div className="mt-1 text-lg font-black text-slate-900"><bdi dir="ltr">{storedKWh.toFixed(2)}<small className="text-xs text-slate-500"> kWh</small></bdi></div><AmpPill tone="emerald" unit="Ah" amps={batteryAmpHours(storedKWh, settings.batteryNominalVoltage)} /></div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-500">المتاح قبل الاحتياطي</div><div className={"mt-1 text-lg font-black " + (usableKWh > 0 ? "text-slate-900" : "text-rose-600")}><bdi dir="ltr">{usableKWh.toFixed(2)}<small className="text-xs text-slate-500"> kWh</small></bdi></div><AmpPill tone="emerald" unit="Ah" amps={batteryAmpHours(usableKWh, settings.batteryNominalVoltage)} /></div>
            </div>}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Reading label="الجهد" value={snapshot?.batteryVoltage != null ? snapshot.batteryVoltage.toFixed(1) : "—"} unit={snapshot?.batteryVoltage != null ? "V" : undefined} muted={snapshot?.batteryVoltage == null} note={settings?.batteryNominalVoltage ? `الاسمي ${settings.batteryNominalVoltage} V` : undefined} />
        <Reading label="التيار" value={amps != null ? amps.toFixed(1) : "—"} unit={amps != null ? "A" : undefined} muted={amps == null} note={snapshot && state !== "idle" ? (state === "charging" ? "داخل إلى البطارية" : "خارج منها") : "لا تيار الآن"} />
        <Reading label="الحرارة" value={snapshot?.batteryTemperature != null ? snapshot.batteryTemperature.toFixed(1) : "—"} unit={snapshot?.batteryTemperature != null ? "°C" : undefined} muted={snapshot?.batteryTemperature == null} note={snapshot?.batteryTemperature != null ? (snapshot.batteryTemperature >= 45 ? "مرتفعة" : "طبيعية") : "تحتاج BMS"} />
      </section>

      {snapshot && eta && <div className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-800"><Clock3 className="h-4 w-4 shrink-0" />الوقت تقديري ويُحسب من السعة المحفوظة والقدرة الحالية، لذلك يتغير مع تغيّر الحمل.</div>}
      {snapshot && snapshot.batteryTemperature == null && <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-[11px] font-bold leading-5 text-amber-800"><Thermometer className="ml-1 inline h-4 w-4" />الحرارة والنسبة الدقيقة يرسلهما جهاز إدارة البطارية (BMS). تظهران بعد توصيل كابل الاتصال من منفذ CAN في البطارية إلى الإنفرتر.</div>}

      <section className="energy-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><Gauge className="h-5 w-5 text-emerald-600" /><div><h2 className="text-sm font-black text-slate-900">أداء البطارية اليوم</h2><p className="text-[11px] font-semibold text-slate-400">ملخص الشحن والتفريغ ونطاق مستوى الشحن</p></div></div>
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-100 rounded-2xl bg-slate-50 py-3 text-center">
          <div><div className="text-[11px] font-bold text-slate-500">شحن</div><div className="mt-1 text-base font-black text-emerald-600"><bdi dir="ltr">{history?.batteryToday ? history.batteryToday.chargeKWh.toFixed(1) : "—"}<span className="text-[10px]"> kWh</span></bdi></div><div className="mt-1"><AmpPill tone="emerald" unit="Ah" amps={history?.batteryToday ? batteryAmpHours(history.batteryToday.chargeKWh, settings?.batteryNominalVoltage) : null} /></div></div>
          <div><div className="text-[11px] font-bold text-slate-500">تفريغ</div><div className="mt-1 text-base font-black text-amber-600"><bdi dir="ltr">{history?.batteryToday ? history.batteryToday.dischargeKWh.toFixed(1) : "—"}<span className="text-[10px]"> kWh</span></bdi></div><div className="mt-1"><AmpPill tone="amber" unit="Ah" amps={history?.batteryToday ? batteryAmpHours(history.batteryToday.dischargeKWh, settings?.batteryNominalVoltage) : null} /></div></div>
          <div><div className="text-[11px] font-bold text-slate-500">أدنى / أعلى</div><div className="mt-1 text-base font-black text-slate-800"><bdi dir="ltr">{history?.socToday ? `${Math.round(history.socToday.min)}–${Math.round(history.socToday.max)}%` : "—"}</bdi></div><div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><CheckCircle2 className="h-3 w-3" />آخر 24 ساعة</div></div>
        </div>
      </section>

      <section className="energy-card space-y-3 p-4 sm:p-5">
        <div><h2 className="text-sm font-black text-slate-900">حركة مستوى الشحن</h2><p className="text-[11px] font-semibold text-slate-400">آخر 24 ساعة مع إظهار حد الاحتياطي</p></div>
        {history && history.points.filter((p) => typeof p.soc === "number").length >= 2 ? <><BatteryFlowSplit points={history.points} now={Date.now()} /><div className="border-t border-slate-100 pt-3"><SocChart points={history.points} timeZone={history.timezone || "Asia/Beirut"} now={Date.now()} reservePct={settings?.batteryMinReservePct ?? 20} /></div></> : <p className="rounded-2xl bg-slate-50 py-7 text-center text-xs font-semibold text-slate-400">يظهر المنحنى بعد تجمّع قراءات كافية (نحو ساعة من الاستخدام).</p>}
      </section>

      {settings && <section className="energy-card desktop-wide p-4 sm:p-5">
        <div className="mb-3"><h2 className="text-sm font-black text-slate-900">مواصفات البطارية</h2><p className="text-[11px] font-semibold text-slate-400">القيم المحفوظة في إعدادات المنظومة</p></div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-[11px] font-bold text-slate-500">النوع</dt><dd className="mt-1 font-black text-emerald-700">{settings.batteryChemistry || "—"}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-[11px] font-bold text-slate-500">السعة</dt><dd className="mt-1 font-black text-emerald-700" dir="ltr">{(settings.batteryCapacityWh / 1000).toFixed(2)} kWh</dd></div>
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-[11px] font-bold text-slate-500">الجهد الاسمي</dt><dd className="mt-1 font-black text-emerald-700" dir="ltr">{settings.batteryNominalVoltage ? `${settings.batteryNominalVoltage} V` : "—"}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-[11px] font-bold text-slate-500">حد الاحتياطي</dt><dd className="mt-1 font-black text-emerald-700" dir="ltr">{settings.batteryMinReservePct}%</dd></div>
        </dl>
        <p className="mt-3 text-[11px] font-semibold text-slate-400">تُعدَّل من الإعدادات ← مواصفات العتاد.</p>
      </section>}

      {!snapshot && !loading && <div className="desktop-wide rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">لا توجد قراءة حية متاحة حاليًا.</div>}
    </div>
  );
}
