"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { AmpPill } from "@/components/amp-pill";
import { AC_VOLTS, batteryAmpHours } from "@/lib/energy";
import { AlertCircle, Bell, CheckCircle2, ChevronDown, Cpu, Database, Eye, EyeOff, Plug, Plus, Radio, RotateCcw, Save, Search, Settings as SettingsIcon, ShieldCheck, X, type LucideIcon } from "lucide-react";

type Protocol = "Modbus RTU" | "Modbus TCP" | "MQTT" | "Cloud API" | "Wi-Fi Datalogger";
type ConnectionMode = "local" | "gateway";
type Inverter = {
  id: string; systemName: string; inverterModel: string; manufacturer?: string | null;
  dataloggerPn?: string | null; dataloggerType?: string | null; dataloggerFirmware?: string | null; dataloggerStationName?: string | null;
  dataloggerDeviceIdentifier?: string | null; dataloggerUpdateIntervalSec?: number | null; dataloggerCloud?: string | null; protocol: Protocol;
  inverterAddress?: string | null; serialPort?: string | null; port?: number | null; baudRate?: number;
  dataBits?: number; stopBits?: number; parity?: "N" | "E" | "O"; slaveId?: number; timeoutMs?: number;
  pollingIntervalMs?: number; gatewayUrl?: string | null; gatewayName?: string | null; connectionMode?: ConnectionMode;
  wifiSsid?: string | null; hasWifiPassword?: boolean; enabled: boolean; isPrimary: boolean; serialNumber?: string | null;
  lastStatus?: string; lastSeenAt?: string | null; lastTestResult?: string | null; lastTestLatencyMs?: number | null; lastTestReason?: string | null;
  mqttBroker?: string | null; mqttPort?: number; mqttTls?: boolean; mqttUsername?: string | null; hasMqttPassword?: boolean; mqttClientId?: string | null; mqttReadTopic?: string | null; mqttStatusTopic?: string | null; mqttCommandTopic?: string | null; mqttQos?: number; mqttKeepAlive?: number;
  cloudApiUrl?: string | null; cloudAuthType?: "api_key" | "bearer" | "username_password"; hasCloudCredential?: boolean; cloudUsername?: string | null; cloudDeviceId?: string | null; cloudReadEndpoint?: string | null; cloudStatusEndpoint?: string | null; cloudTls?: boolean; retryCount?: number; mqttPassword?: string; cloudApiKey?: string; cloudBearerToken?: string; cloudPassword?: string;
};

type Settings = {
  panelPowerW: number; batteryCapacityWh: number; gridTariff: number; exportTariff: number; currency: string;
  latitude: number; longitude: number; timezone: string; panelTilt: number | null; panelAzimuth: number | null;
  batteryNominalVoltage: number; batteryChemistry: string | null; batteryMinReservePct: number;
  bulkChargeVoltage: number | null; floatChargeVoltage: number | null; lowDcCutoffVoltage: number | null;
  backToGridVoltage: number | null; maxChargeCurrentA: number | null;
  outputSourcePriority: "SBU" | "SUB" | "UTI"; chargerSourcePriority: "CSO" | "SNU";
  batteryMaxChargeA: number | null; batteryMaxDischargeA: number | null; inverterRatedPowerKw: number | null;
  gridPhase: "single" | "three"; gridType: "on-grid" | "off-grid" | "hybrid"; retentionDays: number; pollIntervalSec: number;
  lowBatteryPct: number; criticalBatteryPct: number; gridOutageAlert: boolean; faultAlert: boolean;
  offlineMinutes: number; overloadPct: number; channels: "in_app" | "email"; quietHoursStart: string | null; quietHoursEnd: string | null;
};

const defaults: Settings = {
  panelPowerW: 6000, batteryCapacityWh: 4800, gridTariff: 0, exportTariff: 0, currency: "USD",
  latitude: 33.8938, longitude: 35.5018, timezone: "Asia/Beirut", panelTilt: null, panelAzimuth: null,
  batteryNominalVoltage: 48, batteryChemistry: "LiFePO4", batteryMinReservePct: 20,
  bulkChargeVoltage: 56.4, floatChargeVoltage: 54.0, lowDcCutoffVoltage: 44.0, backToGridVoltage: 52.0,
  maxChargeCurrentA: 50, outputSourcePriority: "SBU", chargerSourcePriority: "CSO",
  batteryMaxChargeA: 50, batteryMaxDischargeA: null, inverterRatedPowerKw: 8.2, gridPhase: "single", gridType: "hybrid", retentionDays: 365, pollIntervalSec: 10,
  lowBatteryPct: 20, criticalBatteryPct: 10, gridOutageAlert: true, faultAlert: true, offlineMinutes: 10,
  overloadPct: 90, channels: "in_app", quietHoursStart: null, quietHoursEnd: null,
};

// نمط موحّد للحقول: خلفية رمادية فاتحة، حدّ يتغيّر عند المرور، وحلقة تركيز زرقاء
const input = "w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100";

type SectionTone = "violet" | "amber" | "emerald" | "rose" | "sky";

/* Each section carries the colour of what it controls (same palette as the
 * rest of the app): connection violet, equipment amber, battery/charging
 * emerald, alerts rose, data sky. Full class strings so Tailwind keeps them. */
const SECTION_TONES: Record<SectionTone, { tile: string; stripe: string; chip: string; open: string }> = {
  violet: { tile: "bg-violet-50 text-violet-600 ring-violet-100", stripe: "bg-violet-400", chip: "bg-violet-50 text-violet-700", open: "group-open:border-violet-200" },
  amber: { tile: "bg-amber-50 text-amber-600 ring-amber-100", stripe: "bg-amber-400", chip: "bg-amber-50 text-amber-800", open: "group-open:border-amber-200" },
  emerald: { tile: "bg-emerald-50 text-emerald-600 ring-emerald-100", stripe: "bg-emerald-400", chip: "bg-emerald-50 text-emerald-700", open: "group-open:border-emerald-200" },
  rose: { tile: "bg-rose-50 text-rose-600 ring-rose-100", stripe: "bg-rose-400", chip: "bg-rose-50 text-rose-700", open: "group-open:border-rose-200" },
  sky: { tile: "bg-sky-50 text-sky-600 ring-sky-100", stripe: "bg-sky-400", chip: "bg-sky-50 text-sky-700", open: "group-open:border-sky-200" },
};

/**
 * بطاقة قسم قابلة للطي: شريط لوني + أيقونة + عنوان + ملخص القيم الحالية،
 * وزر «إعادة» يرجع حقول القسم لآخر قيم محفوظة.
 * عند البحث يُخفى القسم غير المطابق ويُفتح القسم المطابق تلقائياً.
 */
function SettingsSection({ icon: Icon, title, subtitle, tone = "sky", summary, keywords = "", query = "", onReset, children, open = false }: { icon: LucideIcon; title: string; subtitle: string; tone?: SectionTone; summary?: React.ReactNode; keywords?: string; query?: string; onReset?: () => void; children: React.ReactNode; open?: boolean }) {
  const q = query.trim().toLowerCase();
  if (q && !`${title} ${subtitle} ${keywords}`.toLowerCase().includes(q)) return null;
  const t = SECTION_TONES[tone];
  return (
    <details open={open || Boolean(q)} className={"group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md " + t.open}>
      <span aria-hidden="true" className={"absolute right-0 top-5 h-11 w-1 rounded-l-full " + t.stripe} />
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition hover:bg-slate-50/70 focus-visible:ring-2 focus-visible:ring-slate-300 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 " + t.tile}><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black text-slate-900 sm:text-lg">{title}</span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-500">{subtitle}</span>
          {summary && <span className={"mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-black " + t.chip}>{summary}</span>}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-open:bg-slate-100">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
        {children}
        {onReset && (
          <div className="flex justify-end border-t border-slate-100 pt-3">
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-slate-300"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />إعادة هذا القسم لآخر قيم محفوظة</button>
          </div>
        )}
      </div>
    </details>
  );
}

/** بطاقة صغيرة في «نظرة سريعة» أعلى الصفحة. */
function GlanceTile({ label, value, dot, amps, ampTone, ampUnit = "A" }: { label: string; value: React.ReactNode; dot: string; amps?: number | null; ampTone?: "sky" | "amber" | "emerald" | "violet"; ampUnit?: "A" | "Ah" }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><span className={"h-2 w-2 rounded-full " + dot} />{label}</div>
      <div className="mt-1 truncate text-base font-black text-slate-900">{value}</div>
      {ampTone && <div className="mt-1.5"><AmpPill tone={ampTone} amps={amps} unit={ampUnit} /></div>}
    </div>
  );
}

/** كتلة «متقدم» قابلة للطي للخيارات الثانوية حتى لا تزدحم الواجهة اليومية. */
function AdvancedBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group/adv rounded-2xl border border-slate-200 bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open/adv:rotate-180" aria-hidden="true" />
      </summary>
      <div className="p-4 pt-1">{children}</div>
    </details>
  );
}

function SettingsField({ label, children, className = "" }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block space-y-2 " + className}>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  // آخر قيم محفوظة: أساس زر «إعادة القسم» ومؤشر التغييرات غير المحفوظة
  const [saved, setSaved] = useState<Settings>(defaults);
  const [query, setQuery] = useState("");
  const [showCloudPassword, setShowCloudPassword] = useState(false);
  const [inverters, setInverters] = useState<Inverter[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<Inverter | null>(null);
  const [loading, setLoading] = useState(true);
  // True only once the real settings arrived; saving is blocked until then so
  // the placeholder defaults can never overwrite the saved values.
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newToken, setNewToken] = useState("");
  const [auditItems, setAuditItems] = useState<Array<{ id: string; action: string; details: string | null; timestamp: string }>>([]);

  const selected = useMemo(() => inverters.find((item) => item.id === selectedId) ?? draft, [inverters, selectedId, draft]);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [s, c] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/inverter/connection", { cache: "no-store" }),
      ]);
      const sd = await s.json().catch(() => ({}));
      const cd = await c.json().catch(() => ({}));
      const errors: string[] = [];
      if (s.ok) { setSettings((value) => ({ ...value, ...sd })); setSaved((value) => ({ ...value, ...sd })); setSettingsLoaded(true); }
      else errors.push(sd.message || "تعذر تحميل إعدادات المنظومة.");
      if (c.ok) {
        const list = (cd.connections || []) as Inverter[];
        setInverters(list);
        const primary = list.find((item) => item.isPrimary) || list[0];
        if (primary) { setSelectedId(primary.id); setDraft({ ...primary }); }
      } else {
        setInverters([]);
        setDraft(null);
        errors.push(cd.message || "تعذر تحميل إعدادات الإنفرتر.");
      }
      if (errors.length) setError(errors.join(" — "));
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحميل الإعدادات."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); void fetch("/api/settings/audit", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((d) => setAuditItems(d?.items || [])).catch(() => {}); }, []);

  // إشعارات Toast: تختفي وحدها، ورسالة «جاري…» تبقى حتى تنتهي العملية
  useEffect(() => {
    if (!message || message.startsWith("جاري")) return;
    const timer = setTimeout(() => setMessage(""), 12000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 15000);
    return () => clearTimeout(timer);
  }, [error]);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved]);
  const resetSection = (keys: Array<keyof Settings>, label: string) => {
    setSettings((old) => {
      const next = { ...old } as Record<string, unknown>;
      for (const key of keys) next[key] = saved[key];
      return next as Settings;
    });
    setMessage(`تمت إعادة «${label}» لآخر قيم محفوظة.`); setError("");
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((old) => ({ ...old, [key]: value }));
  const updateDraft = <K extends keyof Inverter>(key: K, value: Inverter[K]) => setDraft((old) => old ? ({ ...old, [key]: value }) : old);

  const saveAll = async () => {
    if (!settingsLoaded) {
      setError("لم تُحمَّل إعداداتك المحفوظة بعد، لذلك أُوقف الحفظ كي لا تُستبدل بقيم افتراضية. أعد تحميل الصفحة ثم حاول مجددًا.");
      return false;
    }
    setSaving(true); setMessage(""); setError("");
    try {
      const settingsResponse = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const settingsData = await settingsResponse.json().catch(() => ({}));
      if (!settingsResponse.ok) throw new Error(settingsData.message || "تعذر حفظ إعدادات المنظومة.");

      if (!draft) {
        setMessage("تم حفظ إعدادات المنظومة. أضف إنفرترًا لاحقاً لإعداد الاتصال.");
        await load();
        return true;
      }

      const connectionResponse = await fetch("/api/inverter/connection", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id || undefined, systemName: draft.systemName, inverterModel: draft.inverterModel, manufacturer: draft.manufacturer,
          dataloggerPn: draft.dataloggerPn || "", dataloggerType: draft.dataloggerType || "", dataloggerFirmware: draft.dataloggerFirmware || "",
          dataloggerStationName: draft.dataloggerStationName || "", dataloggerDeviceIdentifier: draft.dataloggerDeviceIdentifier || "",
          dataloggerUpdateIntervalSec: draft.dataloggerUpdateIntervalSec || 300, dataloggerCloud: draft.dataloggerCloud || "SmartESS / DESSMonitor",
          protocol: draft.protocol, serialNumber: draft.serialNumber || "", inverterAddress: draft.inverterAddress || "", serialPort: draft.serialPort || "",
          port: draft.port, baudRate: draft.baudRate, dataBits: draft.dataBits, stopBits: draft.stopBits,
          parity: draft.parity, slaveId: draft.slaveId, timeoutMs: draft.timeoutMs, pollingIntervalMs: draft.pollingIntervalMs,
          gatewayUrl: draft.gatewayUrl || "", gatewayName: draft.gatewayName || "", connectionMode: draft.connectionMode || "gateway",
          enabled: draft.enabled, isPrimary: draft.isPrimary,
          mqttBroker: draft.mqttBroker || "", mqttPort: draft.mqttPort, mqttTls: draft.mqttTls, mqttUsername: draft.mqttUsername || "", mqttPassword: (draft as Inverter & { mqttPassword?: string }).mqttPassword || "", mqttClientId: draft.mqttClientId || "", mqttReadTopic: draft.mqttReadTopic || "", mqttStatusTopic: draft.mqttStatusTopic || "", mqttCommandTopic: draft.mqttCommandTopic || "", mqttQos: draft.mqttQos, mqttKeepAlive: draft.mqttKeepAlive,
          cloudApiUrl: draft.cloudApiUrl || "", cloudAuthType: draft.cloudAuthType, cloudApiKey: (draft as Inverter & { cloudApiKey?: string }).cloudApiKey || "", cloudBearerToken: (draft as Inverter & { cloudBearerToken?: string }).cloudBearerToken || "", cloudUsername: draft.cloudUsername || "", cloudPassword: (draft as Inverter & { cloudPassword?: string }).cloudPassword || "", cloudDeviceId: draft.cloudDeviceId || "", cloudReadEndpoint: draft.cloudReadEndpoint || "", cloudStatusEndpoint: draft.cloudStatusEndpoint || "", cloudTls: draft.cloudTls,
        }),
      });
      const connectionData = await connectionResponse.json().catch(() => ({}));
      if (!connectionResponse.ok) throw new Error(connectionData.message || "تعذر حفظ إعدادات الإنفرتر.");
      setMessage("تم حفظ إعدادات المنظومة والإنفرتر بنجاح.");
      await load();
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر الحفظ. لم تُحذف القيم السابقة."); return false; }
    finally { setSaving(false); }
  };

  const addInverter = () => {
    const item: Inverter = {
      id: "", systemName: "منظومة شمسك", inverterModel: "NEXT - Victor Max 8.2KW", manufacturer: "Next Power",
      dataloggerPn: "Q0031255230580", dataloggerType: "Wi-Fi Plug Pro RTU", dataloggerFirmware: "", dataloggerStationName: "",
      dataloggerDeviceIdentifier: "", dataloggerUpdateIntervalSec: 300, dataloggerCloud: "SmartESS / DESSMonitor",
      protocol: "Wi-Fi Datalogger", serialPort: "", port: 502, baudRate: 9600, dataBits: 8, stopBits: 1, parity: "N",
      slaveId: 1, timeoutMs: 1000, pollingIntervalMs: 10000, gatewayUrl: "", gatewayName: "", connectionMode: "gateway",
      enabled: true, isPrimary: inverters.length === 0, lastStatus: "unknown",
    };
    setDraft(item); setSelectedId(""); setMessage(""); setError("");
  };

  const selectInverter = (item: Inverter) => { setSelectedId(item.id); setDraft({ ...item }); setMessage(""); setError(""); };

  const action = async (payload: Record<string, unknown>) => {
    setError(""); setMessage("");
    const response = await fetch("/api/inverter/connection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "تعذر تنفيذ العملية.");
    return data;
  };

  const setPrimary = async () => {
    if (!draft?.id) return;
    try { await action({ action: "setPrimary", id: draft.id }); setMessage("تم تعيين الإنفرتر كأساسي."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر تعيين الإنفرتر الأساسي."); }
  };

  const deleteInverter = async () => {
    if (!draft?.id || !window.confirm("هل تريد حذف هذا الإنفرتر؟")) return;
    try { await action({ action: "delete", id: draft.id }); setMessage("تم حذف الإنفرتر."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر حذف الإنفرتر."); }
  };

  const rotateToken = async () => {
    if (!draft?.id) return;
    try { const data = await action({ action: "rotateGatewayToken", id: draft.id }); setNewToken(data.token || ""); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر إنشاء رمز الربط."); }
  };

  const testConnection = async () => {
    // The server tests what is stored, not what is typed in the form, so a
    // password typed but not yet saved would always report "missing". Save first.
    if (!(await saveAll())) return;
    setMessage("جاري اختبار الاتصال…"); setError("");
    try {
      const response = await fetch("/api/inverter/test", { method: "POST", cache: "no-store", headers: newToken ? { Authorization: "Bearer " + newToken } : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل اختبار الاتصال.");
      setMessage("تم الاتصال بنجاح" + (data.latencyMs ? " — زمن الاستجابة " + data.latencyMs + " ms." : ".") + (data.stored === false && data.storeProblem ? " لكن لم تُحفظ القراءة: " + data.storeProblem : data.stored ? " تم حفظ القراءة في لوحة التحكم." : ""));
      await load(true);
    } catch (e) {
      // الخادم سجّل نتيجة الاختبار، فنعيد تحميل الحالة حتى لا تبقى الشارة «متصل» بعد الفشل
      const reason = e instanceof Error ? e.message : "تعذر اختبار الاتصال.";
      await load(true);
      setMessage(""); setError(reason);
    }
  };

  if (loading) return <div dir="rtl" className="p-6 text-center font-black text-slate-600">جاري تحميل الإعدادات…</div>;

  return (
    <div dir="rtl" className="min-h-[100dvh] w-full space-y-3 overflow-x-hidden overscroll-y-auto bg-slate-50/70 p-2 pb-[calc(12rem+env(safe-area-inset-bottom))] scroll-pb-[calc(12rem+env(safe-area-inset-bottom))] sm:space-y-4 sm:p-4 sm:pb-12">
      <PageHeader icon={SettingsIcon} tone="fuchsia" eyebrow="شمسك • الإعدادات" title="إعدادات المنظومة" subtitle="الاتصال، العتاد، الحماية، التنبيهات والبيانات." />

      {/* بحث سريع: يُصفّي الأقسام حسب العنوان أو أسماء الإعدادات داخلها */}
      <div className="relative">
        <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن إعداد… مثل: بطارية، تنبيه، عملة" aria-label="بحث في الإعدادات" className={input + " bg-white pr-12"} />
      </div>

      {/* نظرة سريعة على المنظومة */}
      {!query.trim() && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <GlanceTile
            label="الاتصال"
            dot={draft?.lastStatus === "connected" ? "bg-emerald-500" : draft?.lastStatus === "error" ? "bg-amber-500" : "bg-slate-300"}
            value={draft?.lastStatus === "connected" ? "متصل" : draft?.lastStatus === "error" ? (/لا يرسل قراءات/.test(draft.lastTestReason ?? "") ? "الدنجل متوقف" : "غير متصل") : draft ? "غير معروف" : "لا إنفرتر"}
          />
          <GlanceTile label="الألواح" dot="bg-amber-400" ampTone="amber" amps={settings.panelPowerW / AC_VOLTS} value={<bdi dir="ltr">{(settings.panelPowerW / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })} kW</bdi>} />
          <GlanceTile label="البطارية" dot="bg-emerald-400" ampTone="emerald" ampUnit="Ah" amps={batteryAmpHours(settings.batteryCapacityWh / 1000, settings.batteryNominalVoltage)} value={<bdi dir="ltr">{(settings.batteryCapacityWh / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} kWh</bdi>} />
          <GlanceTile label="الإنفرتر" dot="bg-sky-400" ampTone="sky" amps={settings.inverterRatedPowerKw ? (settings.inverterRatedPowerKw * 1000) / AC_VOLTS : null} value={<bdi dir="ltr">{settings.inverterRatedPowerKw ? `${settings.inverterRatedPowerKw} kW` : "—"}</bdi>} />
        </div>
      )}

      <SettingsSection icon={Radio} tone="violet" summary={draft ? `${draft.dataloggerCloud || draft.protocol}${draft.isPrimary ? " · أساسي" : ""}` : undefined} query={query} keywords="إنفرتر اتصال دنجل SmartESS اسم المستخدم كلمة المرور PN بوابة MQTT Modbus" title="الإنفرترات والاتصال" subtitle="ربط الإنفرتر بحساب SmartESS واختبار الاتصال" onReset={selectedId ? () => { const item = inverters.find((entry) => entry.id === selectedId); if (item) { setDraft({ ...item }); setMessage("تمت إعادة «الاتصال» لآخر قيم محفوظة."); setError(""); } } : undefined}>
        {inverters.length > 1 && (
          <div className="grid gap-2 sm:grid-cols-2">{inverters.map((item) => (
            <button type="button" key={item.id} onClick={() => selectInverter(item)} className={"rounded-2xl border p-3 text-right transition hover:border-violet-300 " + (selected?.id === item.id ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white")}>
              <strong className="block truncate">{item.systemName}</strong>
              <span className="mt-1 block truncate text-xs text-slate-500">{item.inverterModel}</span>
            </button>
          ))}</div>
        )}

        {draft && <div className="space-y-4">
          {/* الحالة تظهر في «نظرة سريعة» أعلى الصفحة؛ هنا يبقى الشرح فقط عند توقف الدنجل. */}
          {draft.lastStatus === "error" && /لا يرسل قراءات/.test(draft.lastTestReason ?? "") && <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">حساب SmartESS سليم، لكن الدنجل توقف عن رفع القراءات إلى السحابة. أعد تشغيل الدنجل (افصله 20 ثانية ثم أعده)، وسيعود الاتصال تلقائيًا.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingsField label="اسم المنظومة"><input value={draft.systemName} onChange={(e) => updateDraft("systemName", e.target.value)} className={input} /></SettingsField>
            <SettingsField label="رقم Datalogger (PN)"><input dir="ltr" value={draft.dataloggerPn || ""} onChange={(e) => updateDraft("dataloggerPn", e.target.value)} className={input} /></SettingsField>
            <SettingsField label="نوع / موديل الإنفرتر"><select value={draft.inverterModel} onChange={(e) => updateDraft("inverterModel", e.target.value)} className={input}><option>Deye</option><option>Felicity Solar</option><option>Growatt</option><option>NEXT - Victor Max 8.2KW</option><option>Voltronic</option><option>غير ذلك</option></select></SettingsField>
            <SettingsField label="نوع الاتصال"><select value={draft.protocol} onChange={(e) => updateDraft("protocol", e.target.value as Protocol)} className={input}><option>Wi-Fi Datalogger</option><option>Cloud API</option><option>MQTT</option><option>Modbus RTU</option><option>Modbus TCP</option></select></SettingsField>
            {draft.protocol !== "Wi-Fi Datalogger" && <SettingsField label="وضع الاتصال"><select value={draft.connectionMode || "gateway"} onChange={(e) => updateDraft("connectionMode", e.target.value as ConnectionMode)} className={input}><option value="gateway">عبر بوابة</option><option value="local">محلي (نفس الجهاز)</option></select></SettingsField>}
          </div>

          {draft.protocol === "Wi-Fi Datalogger" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="font-black text-emerald-900">بيانات SmartESS / DESSMonitor</h4>
              <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">اسم المستخدم وكلمة المرور هما نفسهما اللذان تدخل بهما إلى تطبيق SmartESS على هاتفك. تُحفظ كلمة المرور مشفّرة ولا تُعرض مرة أخرى.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SettingsField label="اسم مستخدم SmartESS"><input dir="ltr" name="smartess-username" autoComplete="off" autoCapitalize="none" spellCheck={false} value={draft.cloudUsername || ""} onChange={(e) => updateDraft("cloudUsername" as keyof Inverter, e.target.value)} placeholder="اسم الحساب في تطبيق SmartESS" className={input} /></SettingsField>
                <SettingsField label="كلمة مرور SmartESS">
                  <div className="relative">
                    <input dir="ltr" type={showCloudPassword ? "text" : "password"} name="smartess-password" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={draft.cloudPassword || ""} onChange={(e) => updateDraft("cloudPassword" as keyof Inverter, e.target.value)} placeholder={draft.hasCloudCredential ? "محفوظة — اتركها فارغة للإبقاء عليها" : "كلمة مرور تطبيق SmartESS"} className={input + " pl-12"} />
                    <button type="button" onClick={() => setShowCloudPassword((value) => !value)} aria-label={showCloudPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100">{showCloudPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}</button>
                  </div>
                </SettingsField>
              </div>
              <div className="mt-3"><AdvancedBlock title="تفاصيل الدنجل (متقدم)"><div className="grid gap-3 sm:grid-cols-2">
                <SettingsField label="نوع الدنجل"><input dir="ltr" value={draft.dataloggerType || ""} onChange={(e) => updateDraft("dataloggerType", e.target.value)} className={input} /></SettingsField>
                <SettingsField label="Firmware"><input dir="ltr" value={draft.dataloggerFirmware || ""} onChange={(e) => updateDraft("dataloggerFirmware", e.target.value)} className={input} /></SettingsField>
                <SettingsField label="معرّف الجهاز الظاهر في SmartESS"><input dir="ltr" value={draft.dataloggerDeviceIdentifier || ""} onChange={(e) => updateDraft("dataloggerDeviceIdentifier", e.target.value)} className={input} /></SettingsField>
                <SettingsField label="تحديث الدنجل (ثانية)"><input dir="ltr" type="number" min={30} value={draft.dataloggerUpdateIntervalSec || 300} onChange={(e) => updateDraft("dataloggerUpdateIntervalSec", Number(e.target.value))} className={input} /></SettingsField>
                <SettingsField label="المنصة"><input dir="ltr" value={draft.dataloggerCloud || "SmartESS / DESSMonitor"} onChange={(e) => updateDraft("dataloggerCloud", e.target.value)} className={input} /></SettingsField>
                <SettingsField label="محطة SmartESS"><input dir="ltr" value={draft.dataloggerStationName || ""} onChange={(e) => updateDraft("dataloggerStationName", e.target.value)} className={input} /></SettingsField>
              </div></AdvancedBlock></div>
              <p className="mt-3 text-xs font-bold leading-5 text-emerald-800">لن نستخدم معرّف الجهاز أعلاه كـ DevCode أو DevAddr إلا بعد ظهوره صراحةً في بيانات DESSMonitor.</p>
            </div>
          )}

          {draft.connectionMode === "gateway" && draft.protocol !== "Wi-Fi Datalogger" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="font-black text-slate-900">إعدادات البوابة المحلية</h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SettingsField label="اسم البوابة">
                  <input
                    value={draft.gatewayName || ""}
                    onChange={(e) => setDraft((current) => current ? { ...current, gatewayName: e.target.value } : current)}
                    autoComplete="off"
                    className={input + " scroll-mt-24 scroll-mb-32"}
                    onFocus={(e) => requestAnimationFrame(() => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" }))}
                  />
                </SettingsField>
                <SettingsField label="عنوان البوابة">
                  <input
                    dir="ltr"
                    value={draft.gatewayUrl || ""}
                    onChange={(e) => setDraft((current) => current ? { ...current, gatewayUrl: e.target.value } : current)}
                    placeholder="https://gateway.example.com"
                    autoComplete="url"
                    className={input + " scroll-mt-24 scroll-mb-32"}
                    onFocus={(e) => requestAnimationFrame(() => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" }))}
                  />
                </SettingsField>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void rotateToken()} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">تدوير رمز الربط</button>
                {newToken && <code dir="ltr" className="w-full break-all rounded-xl bg-slate-50 p-3 text-xs">{newToken}</code>}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">رمز الربط لا يُحفظ كنص مكشوف ويظهر مرة واحدة فقط.</p>
            </div>
          )}

          <details className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <summary className="cursor-pointer list-none font-black text-slate-800 [&::-webkit-details-marker]:hidden">خيارات الاتصال المتقدمة</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SettingsField label="الرقم التسلسلي (SN)"><input dir="ltr" value={draft.serialNumber || ""} onChange={(e) => updateDraft("serialNumber", e.target.value)} placeholder="مثلاً: SN123456789" className={input} /></SettingsField>
              {draft.protocol === "Modbus TCP" && <><SettingsField label="عنوان IP"><input dir="ltr" value={draft.inverterAddress || ""} onChange={(e) => updateDraft("inverterAddress", e.target.value)} placeholder="192.168.1.50" className={input} /></SettingsField><SettingsField label="منفذ TCP"><input dir="ltr" type="number" value={draft.port || 502} onChange={(e) => updateDraft("port", Number(e.target.value))} className={input} /></SettingsField></>}
              {draft.protocol === "Modbus RTU" && draft.connectionMode === "local" && <><SettingsField label="المنفذ التسلسلي / RS485"><input dir="ltr" value={draft.serialPort || ""} onChange={(e) => updateDraft("serialPort", e.target.value)} placeholder="COM3 أو /dev/ttyUSB0" className={input} /></SettingsField><SettingsField label="Baud Rate"><select value={draft.baudRate || 9600} onChange={(e) => updateDraft("baudRate", Number(e.target.value))} className={input}><option>9600</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></SettingsField><SettingsField label="Parity"><select value={draft.parity || "N"} onChange={(e) => updateDraft("parity", e.target.value as "N" | "E" | "O")} className={input}><option value="N">None</option><option value="E">Even</option><option value="O">Odd</option></select></SettingsField><SettingsField label="Data bits"><select value={draft.dataBits || 8} onChange={(e) => updateDraft("dataBits", Number(e.target.value))} className={input}><option>8</option><option>7</option></select></SettingsField><SettingsField label="Stop bits"><select value={draft.stopBits || 1} onChange={(e) => updateDraft("stopBits", Number(e.target.value))} className={input}><option>1</option><option>2</option></select></SettingsField><SettingsField label="Slave ID"><input dir="ltr" type="number" min={1} max={247} value={draft.slaveId || 1} onChange={(e) => updateDraft("slaveId", Number(e.target.value))} className={input} /></SettingsField></>}
              {draft.protocol === "MQTT" && <><SettingsField label="عنوان Broker"><input dir="ltr" value={draft.mqttBroker || ""} onChange={(e) => updateDraft("mqttBroker", e.target.value)} placeholder="mqtt.example.com" className={input} /></SettingsField><SettingsField label="المنفذ"><input dir="ltr" type="number" value={draft.mqttPort || 1883} onChange={(e) => updateDraft("mqttPort", Number(e.target.value))} className={input} /></SettingsField><SettingsField label="اسم المستخدم"><input dir="ltr" value={draft.mqttUsername || ""} onChange={(e) => updateDraft("mqttUsername", e.target.value)} className={input} /></SettingsField><SettingsField label="كلمة المرور"><input dir="ltr" type="password" placeholder={draft.hasMqttPassword ? "محفوظة — أدخل قيمة جديدة فقط للتغيير" : ""} onChange={(e) => updateDraft("mqttPassword" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="Client ID"><input dir="ltr" value={draft.mqttClientId || ""} onChange={(e) => updateDraft("mqttClientId", e.target.value)} className={input} /></SettingsField><SettingsField label="Topic القراءات"><input dir="ltr" value={draft.mqttReadTopic || ""} onChange={(e) => updateDraft("mqttReadTopic", e.target.value)} className={input} /></SettingsField><SettingsField label="Topic الحالة"><input dir="ltr" value={draft.mqttStatusTopic || ""} onChange={(e) => updateDraft("mqttStatusTopic", e.target.value)} className={input} /></SettingsField><SettingsField label="Topic الأوامر"><input dir="ltr" value={draft.mqttCommandTopic || ""} onChange={(e) => updateDraft("mqttCommandTopic", e.target.value)} className={input} /></SettingsField><SettingsField label="QoS"><select value={draft.mqttQos ?? 0} onChange={(e) => updateDraft("mqttQos" as keyof Inverter, Number(e.target.value))} className={input}><option>0</option><option>1</option><option>2</option></select></SettingsField><SettingsField label="Keep Alive (ثانية)"><input dir="ltr" type="number" value={draft.mqttKeepAlive || 60} onChange={(e) => updateDraft("mqttKeepAlive" as keyof Inverter, Number(e.target.value))} className={input} /></SettingsField><label className="flex min-h-12 items-center justify-between rounded-xl bg-slate-50 px-4 text-sm font-bold"><span>SSL / TLS</span><input type="checkbox" checked={Boolean(draft.mqttTls)} onChange={(e) => updateDraft("mqttTls" as keyof Inverter, e.target.checked)} className="h-5 w-5" /></label></>}
              {draft.protocol === "Cloud API" && <><SettingsField label="عنوان API"><input dir="ltr" value={draft.cloudApiUrl || ""} onChange={(e) => updateDraft("cloudApiUrl" as keyof Inverter, e.target.value)} placeholder="https://api.example.com" className={input} /></SettingsField><SettingsField label="نوع المصادقة"><select value={draft.cloudAuthType || "api_key"} onChange={(e) => updateDraft("cloudAuthType" as keyof Inverter, e.target.value)} className={input}><option value="api_key">API Key</option><option value="bearer">Bearer Token</option><option value="username_password">Username / Password</option></select></SettingsField><SettingsField label="API Key / Token"><input dir="ltr" type="password" onChange={(e) => updateDraft("cloudApiKey" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="اسم المستخدم"><input dir="ltr" value={draft.cloudUsername || ""} onChange={(e) => updateDraft("cloudUsername" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="كلمة المرور"><input dir="ltr" type="password" onChange={(e) => updateDraft("cloudPassword" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="Device ID"><input dir="ltr" value={draft.cloudDeviceId || ""} onChange={(e) => updateDraft("cloudDeviceId" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="Endpoint القراءات"><input dir="ltr" value={draft.cloudReadEndpoint || ""} onChange={(e) => updateDraft("cloudReadEndpoint" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="Endpoint الحالة"><input dir="ltr" value={draft.cloudStatusEndpoint || ""} onChange={(e) => updateDraft("cloudStatusEndpoint" as keyof Inverter, e.target.value)} className={input} /></SettingsField><label className="flex min-h-12 items-center justify-between rounded-xl bg-slate-50 px-4 text-sm font-bold"><span>SSL / TLS</span><input type="checkbox" checked={draft.cloudTls !== false} onChange={(e) => updateDraft("cloudTls" as keyof Inverter, e.target.checked)} className="h-5 w-5" /></label></>}
              <SettingsField label={<>مهلة الاستجابة <bdi dir="ltr">(ms)</bdi></>}><input dir="ltr" type="number" min={200} max={10000} value={draft.timeoutMs || 1000} onChange={(e) => updateDraft("timeoutMs", Number(e.target.value))} className={input} /></SettingsField>
              <SettingsField label={<>فترة القراءة <bdi dir="ltr">(ms)</bdi></>}><input dir="ltr" type="number" min={2000} max={300000} value={draft.pollingIntervalMs || 10000} onChange={(e) => updateDraft("pollingIntervalMs", Number(e.target.value))} className={input} /></SettingsField>
              <SettingsField label="عدد المحاولات"><input dir="ltr" type="number" min={1} max={10} value={draft.retryCount || 3} onChange={(e) => updateDraft("retryCount", Number(e.target.value))} className={input} /></SettingsField>
            </div>
          </details>

          <p className="text-xs font-bold text-slate-500">آخر قراءة: {draft.lastSeenAt ? new Date(draft.lastSeenAt).toLocaleString("ar-u-nu-latn") : "لا توجد"}</p>
          {draft.lastStatus === "error" && draft.lastTestReason && !/لا يرسل قراءات/.test(draft.lastTestReason) && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700">سبب عدم الاتصال: {draft.lastTestReason}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void testConnection()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-700"><Plug className="h-4 w-4" aria-hidden="true" />اختبار الاتصال</button>
            <button type="button" onClick={addInverter} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"><Plus className="h-4 w-4" aria-hidden="true" />إضافة إنفرتر</button>
            {draft.id && !draft.isPrimary && <button type="button" onClick={() => void setPrimary()} className="rounded-xl bg-violet-100 px-4 py-3 text-sm font-black text-violet-700">تعيين كأساسي</button>}
            {draft.id && <button type="button" onClick={() => void deleteInverter()} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">حذف</button>}
          </div>
        </div>}
      </SettingsSection>

      <SettingsSection icon={Cpu} tone="amber" summary={<bdi dir="ltr">{`${(settings.panelPowerW / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })} kW · ${(settings.batteryCapacityWh / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} kWh · ${settings.currency}`}</bdi>} query={query} keywords="ألواح بطارية سعة جهد كيلوواط شبكة طور ميل اتجاه موقع خط العرض خط الطول منطقة زمنية عملة" onReset={() => resetSection(["panelPowerW","batteryCapacityWh","batteryNominalVoltage","batteryChemistry","batteryMinReservePct","inverterRatedPowerKw","gridType","gridPhase","panelTilt","panelAzimuth","latitude","longitude","timezone","currency"], "مواصفات العتاد")} title="مواصفات العتاد" subtitle="الألواح والبطارية والإنفرتر والموقع">
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label={<>إجمالي قدرة الألواح <bdi dir="ltr">(kW)</bdi></>}><input type="number" min={0.1} max={100} step={0.1} value={settings.panelPowerW / 1000} onChange={(e) => updateSetting("panelPowerW", Number(e.target.value) * 1000)} className={input} /><span className="mt-1.5 block"><AmpPill tone="amber" amps={settings.panelPowerW / AC_VOLTS} /></span>{settings.panelPowerW > 100_000 && <p className="mt-1 text-xs font-bold text-rose-600">القيمة بالكيلوواط وليس بالواط: لألواح 6000 واط اكتب 6.</p>}</SettingsField>
          <SettingsField label={<>سعة البطاريات <bdi dir="ltr">(kWh)</bdi></>}><input type="number" min={0.1} step="0.1" value={settings.batteryCapacityWh / 1000} onChange={(e) => { if (e.target.value !== "") updateSetting("batteryCapacityWh", Number(e.target.value) * 1000); }} className={input} /><span className="mt-1.5 block"><AmpPill tone="emerald" unit="Ah" amps={batteryAmpHours(settings.batteryCapacityWh / 1000, settings.batteryNominalVoltage)} /></span></SettingsField>
          <SettingsField label={<>جهد البطارية الاسمي <bdi dir="ltr">(V)</bdi></>}><select value={settings.batteryNominalVoltage} onChange={(e) => updateSetting("batteryNominalVoltage", Number(e.target.value))} className={input}><option value={12}>12</option><option value={24}>24</option><option value={48}>48</option></select></SettingsField>
          <SettingsField label="نوع البطارية"><select value={settings.batteryChemistry || ""} onChange={(e) => updateSetting("batteryChemistry", e.target.value || null)} className={input}><option value="">غير محدد</option><option>LiFePO4</option><option>Lithium-ion</option><option>Lead-acid</option><option>Gel</option><option>AGM</option></select></SettingsField>
          <SettingsField label={<>قدرة الإنفرتر الاسمية <bdi dir="ltr">(kW)</bdi></>}><input type="number" min={0} value={settings.inverterRatedPowerKw ?? ""} onChange={(e) => updateSetting("inverterRatedPowerKw", e.target.value ? Number(e.target.value) : null)} className={input} /><span className="mt-1.5 block"><AmpPill tone="sky" amps={settings.inverterRatedPowerKw ? (settings.inverterRatedPowerKw * 1000) / AC_VOLTS : null} /></span></SettingsField>
        </div>
        <AdvancedBlock title="إعدادات إضافية (الاحتياطي، الشبكة، الاتجاه، الموقع)">
          <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label={<>حد الاحتياطي الأدنى <bdi dir="ltr">(%)</bdi></>}><input type="number" min={0} max={100} value={settings.batteryMinReservePct} onChange={(e) => updateSetting("batteryMinReservePct", Number(e.target.value))} className={input} /></SettingsField>
          <SettingsField label="نوع الشبكة"><select value={settings.gridType} onChange={(e) => updateSetting("gridType", e.target.value as "on-grid" | "off-grid" | "hybrid")} className={input}><option value="on-grid">On-Grid — مرتبطة بالشبكة</option><option value="off-grid">Off-Grid — مستقلة</option><option value="hybrid">Hybrid — هجينة</option></select></SettingsField>
          <SettingsField label="طور الشبكة"><select value={settings.gridPhase} onChange={(e) => updateSetting("gridPhase", e.target.value as "single" | "three")} className={input}><option value="single">أحادية</option><option value="three">ثلاثية</option></select></SettingsField>
          <SettingsField label={<>ميل الألواح <bdi dir="ltr">(°)</bdi></>}><input type="number" min={0} max={90} value={settings.panelTilt ?? ""} onChange={(e) => updateSetting("panelTilt", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label={<>اتجاه الألواح <bdi dir="ltr">(°)</bdi></>}><input type="number" min={0} max={360} value={settings.panelAzimuth ?? ""} onChange={(e) => updateSetting("panelAzimuth", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label="العملة"><select value={settings.currency} onChange={(e) => updateSetting("currency", e.target.value)} className={input}><option value="USD">USD</option><option value="LBP">LBP</option><option value="SYP">SYP</option></select></SettingsField>
          <SettingsField label="خط العرض"><input type="number" value={settings.latitude} onChange={(e) => { if (e.target.value !== "") updateSetting("latitude", Number(e.target.value)); }} className={input} dir="ltr" /></SettingsField>
          <SettingsField label="خط الطول"><input type="number" value={settings.longitude} onChange={(e) => { if (e.target.value !== "") updateSetting("longitude", Number(e.target.value)); }} className={input} dir="ltr" /></SettingsField>
          <SettingsField label="المنطقة الزمنية"><input value={settings.timezone} onChange={(e) => updateSetting("timezone", e.target.value)} className={input} dir="ltr" /></SettingsField>
          </div>
        </AdvancedBlock>
      </SettingsSection>

      <SettingsSection icon={ShieldCheck} tone="emerald" summary={<bdi dir="ltr">{`${settings.outputSourcePriority} · ${settings.bulkChargeVoltage ?? "—"} V`}</bdi>} query={query} keywords="شحن جهد Bulk Float Cut-off تيار أولوية Safe Zone حماية" onReset={() => resetSection(["bulkChargeVoltage","floatChargeVoltage","lowDcCutoffVoltage","backToGridVoltage","maxChargeCurrentA","batteryMaxChargeA","outputSourcePriority","chargerSourcePriority"], "الشحن والحماية")} title="الشحن والحماية" subtitle="جهود الشحن وأولوية المصدر">
        <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">اعتمد قيم شركة البطارية وBMS. شمسك يرفض الحفظ إن كان Low DC Cut-off ≥ Back to Grid أو Float ≥ Bulk.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SettingsField label={<>Bulk / CV <bdi dir="ltr">(V)</bdi></>}><input dir="ltr" type="number" step="0.1" min={20} max={60} value={settings.bulkChargeVoltage ?? ""} onChange={(e) => updateSetting("bulkChargeVoltage", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label={<>Float <bdi dir="ltr">(V)</bdi></>}><input dir="ltr" type="number" step="0.1" min={20} max={60} value={settings.floatChargeVoltage ?? ""} onChange={(e) => updateSetting("floatChargeVoltage", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label={<>Low DC Cut-off <bdi dir="ltr">(V)</bdi></>}><input dir="ltr" type="number" step="0.1" min={15} max={60} value={settings.lowDcCutoffVoltage ?? ""} onChange={(e) => updateSetting("lowDcCutoffVoltage", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label={<>Back to Grid <bdi dir="ltr">(V)</bdi></>}><input dir="ltr" type="number" step="0.1" min={15} max={60} value={settings.backToGridVoltage ?? ""} onChange={(e) => updateSetting("backToGridVoltage", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label={<>Max Charge Current <bdi dir="ltr">(A)</bdi></>}><input dir="ltr" type="number" step="1" min={1} max={300} value={settings.maxChargeCurrentA ?? ""} onChange={(e) => updateSetting("maxChargeCurrentA", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label="Output Source Priority"><select value={settings.outputSourcePriority} onChange={(e) => updateSetting("outputSourcePriority", e.target.value as "SBU" | "SUB" | "UTI")} className={input}><option value="SBU">SBU first — شمسي ← بطارية ← شبكة</option><option value="SUB">Solar first — شمسي ← شبكة ← بطارية</option><option value="UTI">Utility first — الشبكة أولاً</option></select></SettingsField>
          <SettingsField label="Charger Source Priority"><select value={settings.chargerSourcePriority} onChange={(e) => updateSetting("chargerSourcePriority", e.target.value as "CSO" | "SNU")} className={input}><option value="CSO">CSO — شمسي فقط</option><option value="SNU">SNU — شمسي + شبكة</option></select></SettingsField>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => {
            const v = settings.batteryNominalVoltage;
            const lithium = settings.batteryChemistry === "LiFePO4" || settings.batteryChemistry === "Lithium-ion";
            if (v === 24) {
              updateSetting("bulkChargeVoltage", 28.2); updateSetting("floatChargeVoltage", 27.0);
              updateSetting("lowDcCutoffVoltage", lithium ? 22.5 : 21.5); updateSetting("backToGridVoltage", 23.0);
            } else {
              updateSetting("bulkChargeVoltage", 56.4); updateSetting("floatChargeVoltage", 54.0);
              updateSetting("lowDcCutoffVoltage", lithium ? 45.0 : 43.0); updateSetting("backToGridVoltage", 46.0);
            }
            updateSetting("maxChargeCurrentA", lithium ? 50 : 30); updateSetting("batteryMaxChargeA", lithium ? 50 : 30);
            updateSetting("outputSourcePriority", "SBU"); updateSetting("chargerSourcePriority", "CSO");
            setMessage("تم تحميل قالب Safe Zone على الحقول. اضغط «حفظ» لتطبيقه داخل شمسك."); setError("");
          }} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"><ShieldCheck className="ml-1.5 inline h-4 w-4" aria-hidden="true" />تحميل Safe Zone</button>
        </div>
      </SettingsSection>

      <SettingsSection icon={Bell} tone="rose" summary={`منخفضة ${settings.lowBatteryPct}% · حرجة ${settings.criticalBatteryPct}%`} query={query} keywords="تنبيه بطارية منخفضة حرجة انقطاع تحميل زائد هدوء بريد" onReset={() => resetSection(["lowBatteryPct","criticalBatteryPct","offlineMinutes","overloadPct","gridOutageAlert","faultAlert","channels","quietHoursStart","quietHoursEnd"], "التنبيهات")} title="التنبيهات" subtitle="حدود البطارية والانقطاع والأعطال">
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label={<>بطارية منخفضة <bdi dir="ltr">(%)</bdi></>}><input type="number" min={5} max={50} value={settings.lowBatteryPct} onChange={(e) => updateSetting("lowBatteryPct", Number(e.target.value))} className={input} /></SettingsField>
          <SettingsField label={<>بطارية حرجة <bdi dir="ltr">(%)</bdi></>}><input type="number" min={5} max={30} value={settings.criticalBatteryPct} onChange={(e) => updateSetting("criticalBatteryPct", Number(e.target.value))} className={input} /></SettingsField>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[["gridOutageAlert","انقطاع / عودة الشبكة"],["faultAlert","عطل أو تغيّر حالة المنظومة"]].map(([key,label]) => <label key={key} className="flex min-h-14 items-center justify-between rounded-xl bg-slate-50 px-4 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={Boolean(settings[key as "gridOutageAlert" | "faultAlert"])} onChange={(e) => updateSetting(key as "gridOutageAlert" | "faultAlert", e.target.checked)} className="h-6 w-6" /></label>)}
        </div>
        <AdvancedBlock title="إعدادات إضافية (قناة التنبيه، ساعات الهدوء، الحدود)">
          <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label={<>انقطاع الاتصال <bdi dir="ltr">(دقائق)</bdi></>}><input type="number" min={2} max={120} value={settings.offlineMinutes} onChange={(e) => updateSetting("offlineMinutes", Number(e.target.value))} className={input} /></SettingsField>
          <SettingsField label={<>تحميل زائد <bdi dir="ltr">(%)</bdi></>}><input type="number" min={50} max={100} value={settings.overloadPct} onChange={(e) => updateSetting("overloadPct", Number(e.target.value))} className={input} /></SettingsField>
          </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3"><SettingsField label="قناة التنبيه"><select value={settings.channels} onChange={(e) => updateSetting("channels", e.target.value as "in_app" | "email")} className={input}><option value="in_app">داخل التطبيق</option><option value="email">بريد إلكتروني</option></select></SettingsField><SettingsField label="هدوء من"><input type="time" value={settings.quietHoursStart || ""} onChange={(e) => updateSetting("quietHoursStart", e.target.value || null)} className={input} dir="ltr" /></SettingsField><SettingsField label="هدوء إلى"><input type="time" value={settings.quietHoursEnd || ""} onChange={(e) => updateSetting("quietHoursEnd", e.target.value || null)} className={input} dir="ltr" /></SettingsField></div>
        </AdvancedBlock>
      </SettingsSection>

      <SettingsSection icon={Database} tone="sky" summary={`الحفظ ${settings.retentionDays} يوم`} query={query} keywords="بيانات تصدير CSV سجل النشاط مسح الاحتفاظ حفظ" onReset={() => resetSection(["retentionDays"], "البيانات")} title="البيانات" subtitle="مدة الحفظ والتصدير">
          <SettingsField label="مدة حفظ السجل التاريخي"><select value={settings.retentionDays} onChange={(e) => updateSetting("retentionDays", Number(e.target.value))} className={input}><option value={30}>30 يوماً</option><option value={90}>90 يوماً</option><option value={180}>180 يوماً</option><option value={365}>365 يوماً</option><option value={0}>بلا حد</option></select></SettingsField>
        <div className="flex flex-wrap gap-2">
          <a href="/api/settings/export" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">تصدير CSV</a>
          <button type="button" onClick={async () => { if (!window.confirm("سيتم حذف سجل القياسات التاريخية نهائياً. هل أنت متأكد؟")) return; const response = await fetch("/api/settings/export", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "مسح السجل" }) }); const data = await response.json().catch(() => ({})); if (!response.ok) setError(data.message || "تعذر مسح السجل."); else setMessage("تم مسح سجل القياسات التاريخية."); }} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">مسح السجل</button>
        </div>
        <AdvancedBlock title="سجل النشاط">
        <div>
          {auditItems.length === 0 ? <p className="mt-2 text-xs font-semibold text-slate-500">لا توجد أحداث مرتبطة بحساب قاعدة البيانات الحالي.</p> :
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">{auditItems.map((item) => <div key={item.id} className="rounded-xl bg-white p-3 text-sm"><strong>{item.action}</strong><div className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString("ar-u-nu-latn")} · {item.details || "—"}</div></div>)}</div>}
        </div>
        </AdvancedBlock>
      </SettingsSection>

      {/* إشعارات Toast بعد أي عملية */}
      {(error || message) && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3">
          <div role={error ? "alert" : "status"} className={"pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-2xl p-4 text-sm font-black shadow-xl " + (error ? "bg-rose-600 text-white" : message.includes("لكن") ? "bg-amber-500 text-white" : "bg-emerald-600 text-white")}>
            {error ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
            <span className="min-w-0 flex-1 break-words leading-6">{error || message}</span>
            <button type="button" aria-label="إغلاق" onClick={() => { setError(""); setMessage(""); }} className="rounded-lg p-1 transition hover:bg-white/20"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      )}

      {!draft && <button type="button" onClick={addInverter} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 font-black text-white shadow-lg transition hover:bg-slate-800"><Plus className="h-5 w-5" aria-hidden="true" />أضف أول إنفرتر للبدء</button>}
      {query.trim() && <p className="rounded-2xl bg-white p-4 text-center text-sm font-bold text-slate-500">لا توجد نتائج أخرى مطابقة للبحث.</p>}

      {/* شريط الحفظ في نهاية الصفحة (غير ثابت) */}
      <div>
        <div className={"flex items-center justify-between gap-3 rounded-2xl border bg-white p-3 shadow-sm transition " + (dirty ? "border-amber-200" : "border-slate-200")}>
          <span className={"inline-flex items-center gap-2 text-xs font-black " + (dirty ? "text-amber-700" : "text-slate-500")}>
            <span className={"h-2 w-2 rounded-full " + (dirty ? "animate-pulse bg-amber-500" : "bg-emerald-500")} aria-hidden="true" />
            {dirty ? "لديك تغييرات غير محفوظة" : "كل التغييرات محفوظة"}
          </span>
          <button type="button" disabled={saving || !settingsLoaded} onClick={() => void saveAll()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50">
            <Save className="h-4 w-4" aria-hidden="true" />{saving ? "جاري الحفظ…" : "حفظ التغييرات"}
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="h-16" />
    </div>
  );
}
