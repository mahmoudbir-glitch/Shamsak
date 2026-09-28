"use client";

import { useEffect, useMemo, useState } from "react";

type Protocol = "Modbus RTU" | "Modbus TCP" | "Wi-Fi Datalogger";
type ConnectionMode = "local" | "gateway";
type Inverter = {
  id: string; systemName: string; inverterModel: string; manufacturer?: string | null; protocol: Protocol;
  inverterAddress?: string | null; serialPort?: string | null; port?: number | null; baudRate?: number;
  dataBits?: number; stopBits?: number; parity?: "N" | "E" | "O"; slaveId?: number; timeoutMs?: number;
  pollingIntervalMs?: number; gatewayUrl?: string | null; gatewayName?: string | null; connectionMode?: ConnectionMode;
  wifiSsid?: string | null; hasWifiPassword?: boolean; enabled: boolean; isPrimary: boolean;
  lastStatus?: string; lastSeenAt?: string | null; lastTestResult?: string | null; lastTestLatencyMs?: number | null; lastTestReason?: string | null;
};

type Settings = {
  panelPowerW: number; batteryCapacityWh: number; gridTariff: number; exportTariff: number; currency: string;
  latitude: number; longitude: number; timezone: string; panelTilt: number | null; panelAzimuth: number | null;
  batteryNominalVoltage: number; batteryChemistry: string | null; batteryMinReservePct: number;
  batteryMaxChargeA: number | null; batteryMaxDischargeA: number | null; inverterRatedPowerKw: number | null;
  gridPhase: "single" | "three"; retentionDays: number; pollIntervalSec: number;
  lowBatteryPct: number; criticalBatteryPct: number; gridOutageAlert: boolean; faultAlert: boolean;
  offlineMinutes: number; overloadPct: number; channels: "in_app" | "email"; quietHoursStart: string | null; quietHoursEnd: string | null;
};

const defaults: Settings = {
  panelPowerW: 6000, batteryCapacityWh: 10000, gridTariff: 0, exportTariff: 0, currency: "USD",
  latitude: 33.8938, longitude: 35.5018, timezone: "Asia/Beirut", panelTilt: null, panelAzimuth: null,
  batteryNominalVoltage: 48, batteryChemistry: null, batteryMinReservePct: 20, batteryMaxChargeA: null,
  batteryMaxDischargeA: null, inverterRatedPowerKw: null, gridPhase: "single", retentionDays: 365, pollIntervalSec: 10,
  lowBatteryPct: 20, criticalBatteryPct: 10, gridOutageAlert: true, faultAlert: true, offlineMinutes: 10,
  overloadPct: 90, channels: "in_app", quietHoursStart: null, quietHoursEnd: null,
};

const input = "w-full min-h-12 rounded-xl border border-slate-200 bg-indigo-50/60 px-4 font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [inverters, setInverters] = useState<Inverter[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<Inverter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newToken, setNewToken] = useState("");

  const selected = useMemo(() => inverters.find((item) => item.id === selectedId) ?? draft, [inverters, selectedId, draft]);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [s, c] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/inverter/connection", { cache: "no-store" }),
      ]);
      const sd = await s.json(); const cd = await c.json();
      if (s.ok) setSettings((value) => ({ ...value, ...sd }));
      else throw new Error(sd.message || "تعذر تحميل إعدادات المنظومة.");
      if (!c.ok) throw new Error(cd.message || "تعذر تحميل الإنفرترات.");
      const list = (cd.connections || []) as Inverter[];
      setInverters(list);
      const primary = list.find((item) => item.isPrimary) || list[0];
      if (primary) { setSelectedId(primary.id); setDraft({ ...primary }); }
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحميل الإعدادات."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((old) => ({ ...old, [key]: value }));
  const updateDraft = <K extends keyof Inverter>(key: K, value: Inverter[K]) => setDraft((old) => old ? ({ ...old, [key]: value }) : old);

  const saveAll = async () => {
    if (!draft) { setError("أضف إنفرترًا أو اختر إنفرترًا قبل الحفظ."); return; }
    setSaving(true); setMessage(""); setError("");
    try {
      const settingsResponse = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const settingsData = await settingsResponse.json().catch(() => ({}));
      if (!settingsResponse.ok) throw new Error(settingsData.message || "تعذر حفظ إعدادات المنظومة.");

      const connectionResponse = await fetch("/api/inverter/connection", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id || undefined, systemName: draft.systemName, inverterModel: draft.inverterModel, manufacturer: draft.manufacturer,
          protocol: draft.protocol, inverterAddress: draft.inverterAddress || "", serialPort: draft.serialPort || "",
          port: draft.port, baudRate: draft.baudRate, dataBits: draft.dataBits, stopBits: draft.stopBits,
          parity: draft.parity, slaveId: draft.slaveId, timeoutMs: draft.timeoutMs, pollingIntervalMs: draft.pollingIntervalMs,
          gatewayUrl: draft.gatewayUrl || "", gatewayName: draft.gatewayName || "", connectionMode: draft.connectionMode || "gateway",
          enabled: draft.enabled, isPrimary: draft.isPrimary,
        }),
      });
      const connectionData = await connectionResponse.json().catch(() => ({}));
      if (!connectionResponse.ok) throw new Error(connectionData.message || "تعذر حفظ إعدادات الإنفرتر.");
      setMessage("تم حفظ إعدادات المنظومة والإنفرتر بنجاح.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر الحفظ. لم تُحذف القيم السابقة."); }
    finally { setSaving(false); }
  };

  const addInverter = () => {
    const item: Inverter = {
      id: "", systemName: "منظومة جديدة", inverterModel: "Felicity", manufacturer: "Felicity",
      protocol: "Modbus RTU", serialPort: "", port: 502, baudRate: 9600, dataBits: 8, stopBits: 1, parity: "N",
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
    setMessage("جاري اختبار الاتصال…"); setError("");
    try {
      const response = await fetch("/api/inverter/test", { method: "POST", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل اختبار الاتصال.");
      setMessage("تم الاتصال بنجاح" + (data.latencyMs ? " — زمن الاستجابة " + data.latencyMs + " ms." : "."));
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر اختبار الاتصال."); }
  };

  if (loading) return <div dir="rtl" className="p-6 text-center font-black text-slate-600">جاري تحميل الإعدادات…</div>;

  return (
    <div dir="rtl" className="w-full space-y-5 rounded-[2rem] bg-gradient-to-b from-indigo-50/55 via-white/40 to-white/20 p-3 pb-8">
      <div className="energy-card p-5">
        <h1 className="text-2xl font-black text-slate-900">⚙️ إعدادات منظومة شمسك</h1>
        <p className="mt-2 font-medium text-slate-500">تهيئة المنظومة والاتصال والذاكرة والتنبيهات.</p>
      </div>

      <section className="energy-card space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-xl font-black">➕ إضافة إنفرتر جديد</h2><p className="mt-1 text-sm text-slate-500">ابدأ إعداد الجهاز خطوة بخطوة.</p></div>
          <button type="button" onClick={addInverter} className="shrink-0 rounded-xl bg-blue-600 px-4 py-3 font-black text-white">إضافة إنفرتر</button>
        </div>
        <h2 className="border-t border-slate-100 pt-4 text-xl font-black">📋 الإنفرترات المضافة</h2>
        {inverters.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 font-bold text-slate-500">لا توجد إنفرترات محفوظة بعد.</p> :
          <div className="space-y-3">{inverters.map((item) => (
            <button type="button" key={item.id} onClick={() => selectInverter(item)} className={"w-full rounded-2xl border p-4 text-right " + (selected?.id === item.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white")}>
              <div className="flex items-center justify-between gap-3"><strong>{item.systemName}</strong><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{item.lastStatus === "connected" ? "متصل" : item.lastStatus === "error" ? "غير متصل" : "غير معروف"}</span></div>
              <div className="mt-2 text-sm text-slate-500">{item.inverterModel} · <bdi dir="ltr">{item.protocol}</bdi> · {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString("ar") : "لا يوجد اتصال سابق"}</div>
            </button>
          ))}</div>}
      </section>

      {draft && <section className="energy-card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">📡 اتصال الإنفرتر</h2><p className="mt-1 text-sm text-slate-500">حالة الاتصال الفعلية ببيانات الإنفرتر الحية.</p></div><span className={"rounded-full px-3 py-1.5 text-sm font-black " + (draft.lastStatus === "connected" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{draft.lastStatus === "connected" ? "متصل" : draft.lastStatus === "error" ? "غير متصل" : "غير معروف"}</span></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2"><span className="font-bold">اسم المنظومة</span><input value={draft.systemName} onChange={(e) => updateDraft("systemName", e.target.value)} className={input} /></label>
          <label className="space-y-2"><span className="font-bold">نوع / موديل الإنفرتر</span><select value={draft.inverterModel} onChange={(e) => updateDraft("inverterModel", e.target.value)} className={input}><option>Felicity</option><option>Deye</option><option>Growatt</option><option>Voltronic</option><option>غير ذلك</option></select></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2"><span className="font-bold">بروتوكول الاتصال</span><select value={draft.protocol} onChange={(e) => updateDraft("protocol", e.target.value as Protocol)} className={input}><option>Modbus RTU</option><option>Modbus TCP</option><option>Wi-Fi Datalogger</option></select></label>
          <label className="space-y-2"><span className="font-bold">وضع الاتصال</span><select value={draft.connectionMode || "gateway"} onChange={(e) => updateDraft("connectionMode", e.target.value as ConnectionMode)} className={input}><option value="gateway">عبر بوابة</option><option value="local">محلي (نفس الجهاز)</option></select></label>
        </div>
        {draft.protocol === "Modbus TCP" && <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-bold">عنوان IP</span><input dir="ltr" value={draft.inverterAddress || ""} onChange={(e) => updateDraft("inverterAddress", e.target.value)} placeholder="192.168.1.50" className={input} /></label><label className="space-y-2"><span className="font-bold">منفذ TCP</span><input dir="ltr" type="number" value={draft.port || 502} onChange={(e) => updateDraft("port", Number(e.target.value))} className={input} /></label></div>}
        {draft.protocol === "Modbus RTU" && <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-bold">{draft.connectionMode === "gateway" ? "منفذ على جهاز البوابة" : "منفذ الاتصال التسلسلي"}</span><input dir="ltr" value={draft.serialPort || ""} onChange={(e) => updateDraft("serialPort", e.target.value)} placeholder="COM3 أو /dev/ttyUSB0" className={input} /></label><label className="space-y-2"><span className="font-bold">Slave / Unit ID</span><input dir="ltr" type="number" min={1} max={247} value={draft.slaveId || 1} onChange={(e) => updateDraft("slaveId", Number(e.target.value))} className={input} /></label></div>}
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="space-y-2"><span className="font-bold">Baud Rate</span><select value={draft.baudRate || 9600} onChange={(e) => updateDraft("baudRate", Number(e.target.value))} className={input}><option>1200</option><option>2400</option><option>4800</option><option>9600</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></label>
          <label className="space-y-2"><span className="font-bold">Data bits</span><select value={draft.dataBits || 8} onChange={(e) => updateDraft("dataBits", Number(e.target.value))} className={input}><option>7</option><option>8</option></select></label>
          <label className="space-y-2"><span className="font-bold">Parity</span><select value={draft.parity || "N"} onChange={(e) => updateDraft("parity", e.target.value as "N" | "E" | "O")} className={input}><option value="N">None</option><option value="E">Even</option><option value="O">Odd</option></select></label>
          <label className="space-y-2"><span className="font-bold">Stop bits</span><select value={draft.stopBits || 1} onChange={(e) => updateDraft("stopBits", Number(e.target.value))} className={input}><option>1</option><option>2</option></select></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-bold">مهلة الاستجابة <bdi dir="ltr">(ms)</bdi></span><input dir="ltr" type="number" min={200} max={10000} value={draft.timeoutMs || 1000} onChange={(e) => updateDraft("timeoutMs", Number(e.target.value))} className={input} /></label><label className="space-y-2"><span className="font-bold">تكرار القراءة <bdi dir="ltr">(ms)</bdi></span><input dir="ltr" type="number" value={draft.pollingIntervalMs || 10000} onChange={(e) => updateDraft("pollingIntervalMs", Number(e.target.value))} className={input} /></label></div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">آخر قراءة: {draft.lastSeenAt ? new Date(draft.lastSeenAt).toLocaleString("ar") : "لا توجد"} · آخر اختبار: {draft.lastTestResult === "success" ? "ناجح" : draft.lastTestResult === "error" ? "فشل" : "غير معروف"} {draft.lastTestLatencyMs ? "· " + draft.lastTestLatencyMs + " ms" : ""}</div>
        {draft.connectionMode === "gateway" && <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><h3 className="font-black">🌐 البوابة المحلية</h3><label className="space-y-2 block"><span className="font-bold">اسم البوابة</span><input value={draft.gatewayName || ""} onChange={(e) => updateDraft("gatewayName", e.target.value)} className={input} /></label><label className="space-y-2 block"><span className="font-bold">عنوان البوابة</span><input dir="ltr" value={draft.gatewayUrl || ""} onChange={(e) => updateDraft("gatewayUrl", e.target.value)} placeholder="https://gateway.example.com" className={input} /></label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void rotateToken()} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">تدوير رمز الربط</button>{newToken && <code dir="ltr" className="w-full break-all rounded-xl bg-white p-3 text-sm">{newToken}</code>}</div><p className="text-xs font-semibold text-slate-500">رمز الربط لا يُحفظ كنص مكشوف ويظهر مرة واحدة فقط.</p></div>}
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void testConnection()} className="rounded-xl bg-slate-900 px-5 py-3 font-black text-white">🔌 اختبار الاتصال بالإنفرتر</button>{draft.id && !draft.isPrimary && <button type="button" onClick={() => void setPrimary()} className="rounded-xl bg-blue-100 px-5 py-3 font-black text-blue-700">تعيين كأساسي</button>}{draft.id && <button type="button" onClick={() => void deleteInverter()} className="rounded-xl bg-rose-50 px-5 py-3 font-black text-rose-700">حذف</button>}</div>
      </section>}

      <section className="energy-card space-y-4 p-5">
        <h2 className="text-xl font-black">🔧 مواصفات العتاد</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2"><span className="font-bold">إجمالي قدرة الألواح <bdi dir="ltr">(kW)</bdi></span><input type="number" min={0.1} value={settings.panelPowerW / 1000} onChange={(e) => updateSetting("panelPowerW", Number(e.target.value) * 1000)} className={input} /></label>
          <label className="space-y-2"><span className="font-bold">سعة خزان البطاريات <bdi dir="ltr">(kWh)</bdi></span><input type="number" min={0.1} step="0.1" value={(settings.batteryCapacityWh / 1000).toFixed(2)} onChange={(e) => updateSetting("batteryCapacityWh", Number(e.target.value) * 1000)} className={input} /></label>
          <label className="space-y-2"><span className="font-bold">جهد البطارية الاسمي <bdi dir="ltr">(V)</bdi></span><select value={settings.batteryNominalVoltage} onChange={(e) => updateSetting("batteryNominalVoltage", Number(e.target.value))} className={input}><option value={12}>12</option><option value={24}>24</option><option value={48}>48</option></select></label>
          <label className="space-y-2"><span className="font-bold">نوع البطارية</span><select value={settings.batteryChemistry || ""} onChange={(e) => updateSetting("batteryChemistry", e.target.value || null)} className={input}><option value="">غير محدد</option><option>LiFePO4</option><option>Lithium-ion</option><option>Lead-acid</option><option>Gel</option><option>AGM</option></select></label>
          <label className="space-y-2"><span className="font-bold">حد الاحتياطي الأدنى <bdi dir="ltr">(%)</bdi></span><input type="number" min={0} max={100} value={settings.batteryMinReservePct} onChange={(e) => updateSetting("batteryMinReservePct", Number(e.target.value))} className={input} /></label>
          <label className="space-y-2"><span className="font-bold">قدرة الإنفرتر الاسمية <bdi dir="ltr">(kW)</bdi></span><input type="number" min={0} value={settings.inverterRatedPowerKw ?? ""} onChange={(e) => updateSetting("inverterRatedPowerKw", e.target.value ? Number(e.target.value) : null)} className={input} /></label>
          <label className="space-y-2"><span className="font-bold">نوع الشبكة</span><select value={settings.gridPhase} onChange={(e) => updateSetting("gridPhase", e.target.value as "single" | "three")} className={input}><option value="single">أحادية</option><option value="three">ثلاثية</option></select></label>
          <label className="space-y-2"><span className="font-bold">ميل الألواح <bdi dir="ltr">(°)</bdi></span><input type="number" min={0} max={90} value={settings.panelTilt ?? ""} onChange={(e) => updateSetting("panelTilt", e.target.value ? Number(e.target.value) : null)} className={input} /></label>
          <label className="space-y-2"><span className="font-bold">اتجاه الألواح <bdi dir="ltr">(°)</bdi></span><input type="number" min={0} max={360} value={settings.panelAzimuth ?? ""} onChange={(e) => updateSetting("panelAzimuth", e.target.value ? Number(e.target.value) : null)} className={input} /></label>
        </div>
      </section>

      <section className="energy-card space-y-4 p-5">
        <h2 className="text-xl font-black">🔔 التنبيهات</h2>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-bold">بطارية منخفضة <bdi dir="ltr">(%)</bdi></span><input type="number" min={5} max={50} value={settings.lowBatteryPct} onChange={(e) => updateSetting("lowBatteryPct", Number(e.target.value))} className={input} /></label><label className="space-y-2"><span className="font-bold">بطارية حرجة <bdi dir="ltr">(%)</bdi></span><input type="number" min={5} max={30} value={settings.criticalBatteryPct} onChange={(e) => updateSetting("criticalBatteryPct", Number(e.target.value))} className={input} /></label><label className="space-y-2"><span className="font-bold">انقطاع الاتصال <bdi dir="ltr">(دقائق)</bdi></span><input type="number" min={2} max={120} value={settings.offlineMinutes} onChange={(e) => updateSetting("offlineMinutes", Number(e.target.value))} className={input} /></label><label className="space-y-2"><span className="font-bold">تحميل زائد <bdi dir="ltr">(%)</bdi></span><input type="number" min={50} max={100} value={settings.overloadPct} onChange={(e) => updateSetting("overloadPct", Number(e.target.value))} className={input} /></label></div>
        {[["gridOutageAlert","انقطاع / عودة الشبكة"],["faultAlert","عطل أو تغيّر حالة المنظومة"]].map(([key,label]) => <label key={key} className="flex min-h-14 items-center justify-between rounded-xl bg-slate-50 px-4 font-bold"><span>{label}</span><input type="checkbox" checked={Boolean(settings[key as "gridOutageAlert" | "faultAlert"])} onChange={(e) => updateSetting(key as "gridOutageAlert" | "faultAlert", e.target.checked)} className="h-6 w-6" /></label>)}
        <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2"><span className="font-bold">القناة</span><select value={settings.channels} onChange={(e) => updateSetting("channels", e.target.value as "in_app" | "email")} className={input}><option value="in_app">داخل التطبيق</option><option value="email">بريد إلكتروني</option></select></label><label className="space-y-2"><span className="font-bold">هدوء من</span><input type="time" value={settings.quietHoursStart || ""} onChange={(e) => updateSetting("quietHoursStart", e.target.value || null)} className={input} dir="ltr" /></label><label className="space-y-2"><span className="font-bold">هدوء إلى</span><input type="time" value={settings.quietHoursEnd || ""} onChange={(e) => updateSetting("quietHoursEnd", e.target.value || null)} className={input} dir="ltr" /></label></div>
      </section>

      <section className="energy-card space-y-4 p-5">
        <h2 className="text-xl font-black">🧠 البيانات والذاكرة</h2>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-bold">مدة حفظ السجل التاريخي</span><select value={settings.retentionDays} onChange={(e) => updateSetting("retentionDays", Number(e.target.value))} className={input}><option value={30}>30 يوماً</option><option value={90}>90 يوماً</option><option value={180}>180 يوماً</option><option value={365}>365 يوماً</option><option value={0}>بلا حد</option></select></label><label className="space-y-2"><span className="font-bold">تكرار قراءة الإنفرتر</span><select value={settings.pollIntervalSec} onChange={(e) => updateSetting("pollIntervalSec", Number(e.target.value))} className={input}><option value={5}>5 ثوانٍ</option><option value={10}>10 ثوانٍ</option><option value={30}>30 ثانية</option><option value={60}>60 ثانية</option></select></label></div>
        <p className="text-sm font-semibold text-slate-500">التصدير والنسخ الاحتياطي ومسح السجل تُضاف فقط عند توفر مسارات بيانات آمنة ومكتملة؛ لن تظهر أزراراً وهمية لا تنفذ فعلياً.</p>
      </section>

      <section className="energy-card space-y-4 p-5">
        <h2 className="text-xl font-black">📍 الموقع والوقت</h2>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-bold">المنطقة الزمنية</span><input value={settings.timezone} onChange={(e) => updateSetting("timezone", e.target.value)} className={input} dir="ltr" /></label><label className="space-y-2"><span className="font-bold">العملة</span><select value={settings.currency} onChange={(e) => updateSetting("currency", e.target.value)} className={input}><option value="USD">USD</option><option value="LBP">LBP</option><option value="SYP">SYP</option></select></label><label className="space-y-2"><span className="font-bold">خط العرض</span><input type="number" value={settings.latitude} onChange={(e) => updateSetting("latitude", Number(e.target.value))} className={input} dir="ltr" /></label><label className="space-y-2"><span className="font-bold">خط الطول</span><input type="number" value={settings.longitude} onChange={(e) => updateSetting("longitude", Number(e.target.value))} className={input} dir="ltr" /></label></div>
        <p className="text-sm font-semibold text-slate-500">التعرفة والعملة موجودتان فعلياً في تبويب «المال»، لذلك لا يتم إنشاء مصدر ثانٍ لها هنا؛ هذه القيم مرتبطة بجدول <bdi dir="ltr">EnergySettings</bdi>.</p>
      </section>

      {error && <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-center font-black text-rose-700">{error}</div>}
      {message && <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-center font-black text-emerald-700">{message}</div>}
      <button type="button" disabled={saving || !draft} onClick={() => void saveAll()} className="min-h-16 w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "جاري الحفظ…" : "💾 حفظ إعدادات المنظومة"}</button>
    </div>
  );
}
