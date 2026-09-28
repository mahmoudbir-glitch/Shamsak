"use client";

import { useEffect, useMemo, useState } from "react";

type Protocol = "Modbus RTU" | "Modbus TCP" | "MQTT" | "Cloud API" | "Wi-Fi Datalogger";
type ConnectionMode = "local" | "gateway";
type Inverter = {
  id: string; systemName: string; inverterModel: string; manufacturer?: string | null; protocol: Protocol;
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
  batteryMaxChargeA: number | null; batteryMaxDischargeA: number | null; inverterRatedPowerKw: number | null;
  gridPhase: "single" | "three"; gridType: "on-grid" | "off-grid" | "hybrid"; retentionDays: number; pollIntervalSec: number;
  lowBatteryPct: number; criticalBatteryPct: number; gridOutageAlert: boolean; faultAlert: boolean;
  offlineMinutes: number; overloadPct: number; channels: "in_app" | "email"; quietHoursStart: string | null; quietHoursEnd: string | null;
};

const defaults: Settings = {
  panelPowerW: 6000, batteryCapacityWh: 10000, gridTariff: 0, exportTariff: 0, currency: "SYP",
  latitude: 33.8938, longitude: 35.5018, timezone: "Asia/Beirut", panelTilt: null, panelAzimuth: null,
  batteryNominalVoltage: 48, batteryChemistry: "LiFePO4", batteryMinReservePct: 20, batteryMaxChargeA: null,
  batteryMaxDischargeA: null, inverterRatedPowerKw: 8.2, gridPhase: "single", gridType: "hybrid", retentionDays: 365, pollIntervalSec: 10,
  lowBatteryPct: 20, criticalBatteryPct: 10, gridOutageAlert: true, faultAlert: true, offlineMinutes: 10,
  overloadPct: 90, channels: "in_app", quietHoursStart: null, quietHoursEnd: null,
};

const input = "w-full min-h-12 rounded-xl border border-slate-200 bg-indigo-50/60 px-4 font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

function SettingsSection({ icon, title, subtitle, children, open = false }: { icon: string; title: string; subtitle: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black text-slate-900 sm:text-lg">{title}</span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-500">{subtitle}</span>
        </span>
        <span className="text-lg font-black text-slate-400">⌄</span>
      </summary>
      <div className="border-t border-slate-100 p-4 sm:p-5">{children}</div>
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
  const [inverters, setInverters] = useState<Inverter[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<Inverter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newToken, setNewToken] = useState("");
  const [auditItems, setAuditItems] = useState<Array<{ id: string; action: string; details: string | null; timestamp: string }>>([]);

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

  useEffect(() => { void load(); void fetch("/api/settings/audit", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((d) => setAuditItems(d?.items || [])).catch(() => {}); }, []);

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
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر الحفظ. لم تُحذف القيم السابقة."); }
    finally { setSaving(false); }
  };

  const addInverter = () => {
    const item: Inverter = {
      id: "", systemName: "منظومة شمسك", inverterModel: "NEXT - Victor Max 8.2KW", manufacturer: "NEXT", serialNumber: "92085230517098",
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
    <div dir="rtl" className="w-full space-y-3 bg-slate-50/70 p-2 pb-28 sm:space-y-4 sm:p-4">
      <header className="rounded-[1.5rem] bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-500 p-5 text-white shadow-lg sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">⚙️</div>
          <div className="min-w-0">
            <h1 className="text-xl font-black sm:text-2xl">إعدادات منظومة شمسك</h1>
            <p className="mt-1 text-sm font-medium text-blue-50">كل الإعدادات مرتبة حسب وظيفتها — افتح ما تحتاجه فقط.</p>
          </div>
        </div>
      </header>

      {draft && (
        <div className="sticky top-2 z-20 rounded-2xl border border-blue-100 bg-white/95 p-3 shadow-md backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-slate-900">{draft.systemName}</div>
              <div className="mt-0.5 text-xs font-semibold text-slate-500">
                {draft.inverterModel} · {draft.lastStatus === "connected" ? "متصل" : draft.lastStatus === "error" ? "غير متصل" : "غير معروف"}
              </div>
            </div>
            <button type="button" disabled={saving} onClick={() => void saveAll()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:opacity-50">
              {saving ? "جاري الحفظ…" : "💾 حفظ"}
            </button>
          </div>
        </div>
      )}

      <SettingsSection icon="📡" title="الإنفرترات والاتصال" subtitle="إضافة الأجهزة، الاتصال، البوابة واختبار الربط" open>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-black text-slate-900">الإنفرترات المضافة</h2><p className="mt-1 text-xs font-semibold text-slate-500">اختر جهازًا لتعديل إعداداته أو أضف جهازًا جديدًا.</p></div>
            <button type="button" onClick={addInverter} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white">＋ إضافة إنفرتر</button>
          </div>
          {inverters.length === 0 ? <p className="rounded-xl bg-white p-4 text-sm font-bold text-slate-500">لا توجد إنفرترات محفوظة بعد.</p> :
            <div className="grid gap-2 sm:grid-cols-2">{inverters.map((item) => (
              <button type="button" key={item.id} onClick={() => selectInverter(item)} className={"rounded-2xl border p-3 text-right transition " + (selected?.id === item.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white")}>
                <div className="flex items-center justify-between gap-2"><strong className="truncate">{item.systemName}</strong><span className={"rounded-full px-2.5 py-1 text-[11px] font-black " + (item.lastStatus === "connected" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{item.lastStatus === "connected" ? "متصل" : item.lastStatus === "error" ? "غير متصل" : "غير معروف"}</span></div>
                <div className="mt-1.5 truncate text-xs text-slate-500">{item.inverterModel} · <bdi dir="ltr">{item.protocol}</bdi></div>
              </button>
            ))}</div>}
        </div>

        {draft && <div className="mt-4 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2"><div><h3 className="font-black text-slate-900">تفاصيل الاتصال</h3><p className="mt-0.5 text-xs font-semibold text-slate-500">البيانات الأساسية ثم الخيارات المتقدمة عند الحاجة.</p></div><span className={"rounded-full px-3 py-1.5 text-xs font-black " + (draft.lastStatus === "connected" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>{draft.lastStatus === "connected" ? "متصل" : draft.lastStatus === "error" ? "غير متصل" : "غير معروف"}</span></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingsField label="اسم المنظومة"><input value={draft.systemName} onChange={(e) => updateDraft("systemName", e.target.value)} className={input} /></SettingsField>
            <SettingsField label="الرقم التسلسلي (SN)"><input dir="ltr" value={draft.serialNumber || ""} onChange={(e) => updateDraft("serialNumber", e.target.value)} placeholder="مثلاً: SN123456789" className={input} /></SettingsField>
            <SettingsField label="نوع / موديل الإنفرتر"><select value={draft.inverterModel} onChange={(e) => updateDraft("inverterModel", e.target.value)} className={input}><option>NEXT - Victor Max 8.2KW</option><option>Felicity</option><option>Deye</option><option>Growatt</option><option>Voltronic</option><option>غير ذلك</option></select></SettingsField>
            <SettingsField label="نوع الاتصال"><select value={draft.protocol} onChange={(e) => updateDraft("protocol", e.target.value as Protocol)} className={input}><option>Modbus TCP</option><option>Modbus RTU</option><option>MQTT</option><option>Cloud API</option>{draft.protocol === "Wi-Fi Datalogger" && <option>Wi-Fi Datalogger</option>}</select></SettingsField>
            <SettingsField label="وضع الاتصال"><select value={draft.connectionMode || "gateway"} onChange={(e) => updateDraft("connectionMode", e.target.value as ConnectionMode)} className={input}><option value="gateway">عبر بوابة</option><option value="local">محلي (نفس الجهاز)</option></select></SettingsField>
          </div>

          {draft.connectionMode === "gateway" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="font-black text-slate-900">🌐 إعدادات البوابة المحلية</h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SettingsField label="اسم البوابة">
                  <input
                    value={draft.gatewayName || ""}
                    onChange={(e) => setDraft((current) => current ? { ...current, gatewayName: e.target.value } : current)}
                    autoComplete="off"
                    className={input}
                  />
                </SettingsField>
                <SettingsField label="عنوان البوابة">
                  <input
                    dir="ltr"
                    value={draft.gatewayUrl || ""}
                    onChange={(e) => setDraft((current) => current ? { ...current, gatewayUrl: e.target.value } : current)}
                    placeholder="https://gateway.example.com"
                    autoComplete="url"
                    className={input}
                  />
                </SettingsField>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void rotateToken()} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">تدوير رمز الربط</button>
                {newToken && <code dir="ltr" className="w-full break-all rounded-xl bg-slate-50 p-3 text-xs">{newToken}</code>}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">رمز الربط لا يُحفظ كنص مكشوف ويظهر مرة واحدة فقط.</p>
            </div>
          )

          <details className="rounded-2xl bg-white p-4">
            <summary className="cursor-pointer list-none font-black text-slate-800 [&::-webkit-details-marker]:hidden">⚙️ خيارات الاتصال المتقدمة</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {draft.protocol === "Modbus TCP" && <><SettingsField label="عنوان IP"><input dir="ltr" value={draft.inverterAddress || ""} onChange={(e) => updateDraft("inverterAddress", e.target.value)} placeholder="192.168.1.50" className={input} /></SettingsField><SettingsField label="منفذ TCP"><input dir="ltr" type="number" value={draft.port || 502} onChange={(e) => updateDraft("port", Number(e.target.value))} className={input} /></SettingsField></>}
              {draft.protocol === "Modbus RTU" && <><SettingsField label="المنفذ التسلسلي / RS485"><input dir="ltr" value={draft.serialPort || ""} onChange={(e) => updateDraft("serialPort", e.target.value)} placeholder="COM3 أو /dev/ttyUSB0" className={input} /></SettingsField><SettingsField label="Baud Rate"><select value={draft.baudRate || 9600} onChange={(e) => updateDraft("baudRate", Number(e.target.value))} className={input}><option>9600</option><option>19200</option><option>38400</option><option>57600</option><option>115200</option></select></SettingsField><SettingsField label="Parity"><select value={draft.parity || "N"} onChange={(e) => updateDraft("parity", e.target.value as "N" | "E" | "O")} className={input}><option value="N">None</option><option value="E">Even</option><option value="O">Odd</option></select></SettingsField><SettingsField label="Data bits"><select value={draft.dataBits || 8} onChange={(e) => updateDraft("dataBits", Number(e.target.value))} className={input}><option>8</option><option>7</option></select></SettingsField><SettingsField label="Stop bits"><select value={draft.stopBits || 1} onChange={(e) => updateDraft("stopBits", Number(e.target.value))} className={input}><option>1</option><option>2</option></select></SettingsField><SettingsField label="Slave ID"><input dir="ltr" type="number" min={1} max={247} value={draft.slaveId || 1} onChange={(e) => updateDraft("slaveId", Number(e.target.value))} className={input} /></SettingsField></>}
              {draft.protocol === "MQTT" && <><SettingsField label="عنوان Broker"><input dir="ltr" value={draft.mqttBroker || ""} onChange={(e) => updateDraft("mqttBroker", e.target.value)} placeholder="mqtt.example.com" className={input} /></SettingsField><SettingsField label="المنفذ"><input dir="ltr" type="number" value={draft.mqttPort || 1883} onChange={(e) => updateDraft("mqttPort", Number(e.target.value))} className={input} /></SettingsField><SettingsField label="اسم المستخدم"><input dir="ltr" value={draft.mqttUsername || ""} onChange={(e) => updateDraft("mqttUsername", e.target.value)} className={input} /></SettingsField><SettingsField label="كلمة المرور"><input dir="ltr" type="password" placeholder={draft.hasMqttPassword ? "محفوظة — أدخل قيمة جديدة فقط للتغيير" : ""} onChange={(e) => updateDraft("mqttPassword" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="Client ID"><input dir="ltr" value={draft.mqttClientId || ""} onChange={(e) => updateDraft("mqttClientId", e.target.value)} className={input} /></SettingsField><SettingsField label="Topic القراءات"><input dir="ltr" value={draft.mqttReadTopic || ""} onChange={(e) => updateDraft("mqttReadTopic", e.target.value)} className={input} /></SettingsField><SettingsField label="Topic الحالة"><input dir="ltr" value={draft.mqttStatusTopic || ""} onChange={(e) => updateDraft("mqttStatusTopic", e.target.value)} className={input} /></SettingsField><SettingsField label="Topic الأوامر"><input dir="ltr" value={draft.mqttCommandTopic || ""} onChange={(e) => updateDraft("mqttCommandTopic", e.target.value)} className={input} /></SettingsField><SettingsField label="QoS"><select value={draft.mqttQos ?? 0} onChange={(e) => updateDraft("mqttQos" as keyof Inverter, Number(e.target.value))} className={input}><option>0</option><option>1</option><option>2</option></select></SettingsField><SettingsField label="Keep Alive (ثانية)"><input dir="ltr" type="number" value={draft.mqttKeepAlive || 60} onChange={(e) => updateDraft("mqttKeepAlive" as keyof Inverter, Number(e.target.value))} className={input} /></SettingsField><label className="flex min-h-12 items-center justify-between rounded-xl bg-slate-50 px-4 text-sm font-bold"><span>SSL / TLS</span><input type="checkbox" checked={Boolean(draft.mqttTls)} onChange={(e) => updateDraft("mqttTls" as keyof Inverter, e.target.checked)} className="h-5 w-5" /></label></>}
              {draft.protocol === "Cloud API" && <><SettingsField label="عنوان API"><input dir="ltr" value={draft.cloudApiUrl || ""} onChange={(e) => updateDraft("cloudApiUrl" as keyof Inverter, e.target.value)} placeholder="https://api.example.com" className={input} /></SettingsField><SettingsField label="نوع المصادقة"><select value={draft.cloudAuthType || "api_key"} onChange={(e) => updateDraft("cloudAuthType" as keyof Inverter, e.target.value)} className={input}><option value="api_key">API Key</option><option value="bearer">Bearer Token</option><option value="username_password">Username / Password</option></select></SettingsField><SettingsField label="API Key / Token"><input dir="ltr" type="password" onChange={(e) => updateDraft("cloudApiKey" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="اسم المستخدم"><input dir="ltr" value={draft.cloudUsername || ""} onChange={(e) => updateDraft("cloudUsername" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="كلمة المرور"><input dir="ltr" type="password" onChange={(e) => updateDraft("cloudPassword" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="Device ID"><input dir="ltr" value={draft.cloudDeviceId || ""} onChange={(e) => updateDraft("cloudDeviceId" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="Endpoint القراءات"><input dir="ltr" value={draft.cloudReadEndpoint || ""} onChange={(e) => updateDraft("cloudReadEndpoint" as keyof Inverter, e.target.value)} className={input} /></SettingsField><SettingsField label="Endpoint الحالة"><input dir="ltr" value={draft.cloudStatusEndpoint || ""} onChange={(e) => updateDraft("cloudStatusEndpoint" as keyof Inverter, e.target.value)} className={input} /></SettingsField><label className="flex min-h-12 items-center justify-between rounded-xl bg-slate-50 px-4 text-sm font-bold"><span>SSL / TLS</span><input type="checkbox" checked={draft.cloudTls !== false} onChange={(e) => updateDraft("cloudTls" as keyof Inverter, e.target.checked)} className="h-5 w-5" /></label></>}
              <SettingsField label={<>مهلة الاستجابة <bdi dir="ltr">(ms)</bdi></>}><input dir="ltr" type="number" min={200} max={10000} value={draft.timeoutMs || 1000} onChange={(e) => updateDraft("timeoutMs", Number(e.target.value))} className={input} /></SettingsField>
              <SettingsField label={<>فترة القراءة <bdi dir="ltr">(ms)</bdi></>}><input dir="ltr" type="number" min={2000} max={300000} value={draft.pollingIntervalMs || 10000} onChange={(e) => updateDraft("pollingIntervalMs", Number(e.target.value))} className={input} /></SettingsField>
              <SettingsField label="عدد المحاولات"><input dir="ltr" type="number" min={1} max={10} value={draft.retryCount || 3} onChange={(e) => updateDraft("retryCount", Number(e.target.value))} className={input} /></SettingsField>
            </div>
          </details>

          {draft.connectionMode === "gateway" && <details className="rounded-2xl bg-white p-4">
            <summary className="cursor-pointer list-none font-black text-slate-800 [&::-webkit-details-marker]:hidden">🌐 إعدادات البوابة المحلية</summary>
            <div className="mt-4 space-y-3"><SettingsField label="اسم البوابة"><input value={draft.gatewayName || ""} onChange={(e) => updateDraft("gatewayName", e.target.value)} className={input} /></SettingsField><SettingsField label="عنوان البوابة"><input dir="ltr" value={draft.gatewayUrl || ""} onChange={(e) => updateDraft("gatewayUrl", e.target.value)} placeholder="https://gateway.example.com" className={input} /></SettingsField><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void rotateToken()} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">تدوير رمز الربط</button>{newToken && <code dir="ltr" className="w-full break-all rounded-xl bg-slate-50 p-3 text-xs">{newToken}</code>}</div><p className="text-xs font-semibold text-slate-500">رمز الربط لا يُحفظ كنص مكشوف ويظهر مرة واحدة فقط.</p></div>
          </details>}

          <div className="rounded-2xl bg-white p-4 text-xs font-bold text-slate-500">آخر قراءة: {draft.lastSeenAt ? new Date(draft.lastSeenAt).toLocaleString("ar") : "لا توجد"} · آخر اختبار: {draft.lastTestResult === "success" ? "ناجح" : draft.lastTestResult === "error" ? "فشل" : "غير معروف"} {draft.lastTestLatencyMs ? "· " + draft.lastTestLatencyMs + " ms" : ""}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void testConnection()} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">🔌 اختبار الاتصال</button>
            {draft.id && !draft.isPrimary && <button type="button" onClick={() => void setPrimary()} className="rounded-xl bg-blue-100 px-4 py-3 text-sm font-black text-blue-700">تعيين كأساسي</button>}
            {draft.id && <button type="button" onClick={() => void deleteInverter()} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">حذف</button>}
          </div>
        </div>}
      </SettingsSection>

      <SettingsSection icon="🔧" title="مواصفات العتاد" subtitle="الألواح والبطارية والإنفرتر والشبكة والاتجاه">
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label={<>إجمالي قدرة الألواح <bdi dir="ltr">(kW)</bdi></>}><input type="number" min={0.1} value={settings.panelPowerW / 1000} onChange={(e) => updateSetting("panelPowerW", Number(e.target.value) * 1000)} className={input} /></SettingsField>
          <SettingsField label={<>سعة البطاريات <bdi dir="ltr">(kWh)</bdi></>}><input type="number" min={0.1} step="0.1" value={(settings.batteryCapacityWh / 1000).toFixed(2)} onChange={(e) => updateSetting("batteryCapacityWh", Number(e.target.value) * 1000)} className={input} /></SettingsField>
          <SettingsField label={<>جهد البطارية الاسمي <bdi dir="ltr">(V)</bdi></>}><select value={settings.batteryNominalVoltage} onChange={(e) => updateSetting("batteryNominalVoltage", Number(e.target.value))} className={input}><option value={12}>12</option><option value={24}>24</option><option value={48}>48</option></select></SettingsField>
          <SettingsField label="نوع البطارية"><select value={settings.batteryChemistry || ""} onChange={(e) => updateSetting("batteryChemistry", e.target.value || null)} className={input}><option value="">غير محدد</option><option>LiFePO4</option><option>Lithium-ion</option><option>Lead-acid</option><option>Gel</option><option>AGM</option></select></SettingsField>
          <SettingsField label={<>حد الاحتياطي الأدنى <bdi dir="ltr">(%)</bdi></>}><input type="number" min={0} max={100} value={settings.batteryMinReservePct} onChange={(e) => updateSetting("batteryMinReservePct", Number(e.target.value))} className={input} /></SettingsField>
          <SettingsField label={<>قدرة الإنفرتر الاسمية <bdi dir="ltr">(kW)</bdi></>}><input type="number" min={0} value={settings.inverterRatedPowerKw ?? ""} onChange={(e) => updateSetting("inverterRatedPowerKw", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label="نوع الشبكة"><select value={settings.gridType} onChange={(e) => updateSetting("gridType", e.target.value as "on-grid" | "off-grid" | "hybrid")} className={input}><option value="on-grid">On-Grid — مرتبطة بالشبكة</option><option value="off-grid">Off-Grid — مستقلة</option><option value="hybrid">Hybrid — هجينة</option></select></SettingsField>
          <SettingsField label="طور الشبكة"><select value={settings.gridPhase} onChange={(e) => updateSetting("gridPhase", e.target.value as "single" | "three")} className={input}><option value="single">أحادية</option><option value="three">ثلاثية</option></select></SettingsField>
          <SettingsField label={<>ميل الألواح <bdi dir="ltr">(°)</bdi></>}><input type="number" min={0} max={90} value={settings.panelTilt ?? ""} onChange={(e) => updateSetting("panelTilt", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
          <SettingsField label={<>اتجاه الألواح <bdi dir="ltr">(°)</bdi></>}><input type="number" min={0} max={360} value={settings.panelAzimuth ?? ""} onChange={(e) => updateSetting("panelAzimuth", e.target.value ? Number(e.target.value) : null)} className={input} /></SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection icon="🔔" title="التنبيهات" subtitle="حدود البطارية والانقطاع والأعطال وساعات الهدوء">
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label={<>بطارية منخفضة <bdi dir="ltr">(%)</bdi></>}><input type="number" min={5} max={50} value={settings.lowBatteryPct} onChange={(e) => updateSetting("lowBatteryPct", Number(e.target.value))} className={input} /></SettingsField>
          <SettingsField label={<>بطارية حرجة <bdi dir="ltr">(%)</bdi></>}><input type="number" min={5} max={30} value={settings.criticalBatteryPct} onChange={(e) => updateSetting("criticalBatteryPct", Number(e.target.value))} className={input} /></SettingsField>
          <SettingsField label={<>انقطاع الاتصال <bdi dir="ltr">(دقائق)</bdi></>}><input type="number" min={2} max={120} value={settings.offlineMinutes} onChange={(e) => updateSetting("offlineMinutes", Number(e.target.value))} className={input} /></SettingsField>
          <SettingsField label={<>تحميل زائد <bdi dir="ltr">(%)</bdi></>}><input type="number" min={50} max={100} value={settings.overloadPct} onChange={(e) => updateSetting("overloadPct", Number(e.target.value))} className={input} /></SettingsField>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[["gridOutageAlert","انقطاع / عودة الشبكة"],["faultAlert","عطل أو تغيّر حالة المنظومة"]].map(([key,label]) => <label key={key} className="flex min-h-14 items-center justify-between rounded-xl bg-slate-50 px-4 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={Boolean(settings[key as "gridOutageAlert" | "faultAlert"])} onChange={(e) => updateSetting(key as "gridOutageAlert" | "faultAlert", e.target.checked)} className="h-6 w-6" /></label>)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><SettingsField label="قناة التنبيه"><select value={settings.channels} onChange={(e) => updateSetting("channels", e.target.value as "in_app" | "email")} className={input}><option value="in_app">داخل التطبيق</option><option value="email">بريد إلكتروني</option></select></SettingsField><SettingsField label="هدوء من"><input type="time" value={settings.quietHoursStart || ""} onChange={(e) => updateSetting("quietHoursStart", e.target.value || null)} className={input} dir="ltr" /></SettingsField><SettingsField label="هدوء إلى"><input type="time" value={settings.quietHoursEnd || ""} onChange={(e) => updateSetting("quietHoursEnd", e.target.value || null)} className={input} dir="ltr" /></SettingsField></div>
      </SettingsSection>

      <SettingsSection icon="📍" title="الموقع والوقت" subtitle="المنطقة الزمنية والموقع والعملة">
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label="المنطقة الزمنية"><input value={settings.timezone} onChange={(e) => updateSetting("timezone", e.target.value)} className={input} dir="ltr" /></SettingsField>
          <SettingsField label="العملة"><select value={settings.currency} onChange={(e) => updateSetting("currency", e.target.value)} className={input}><option value="USD">USD</option><option value="LBP">LBP</option><option value="SYP">SYP</option></select></SettingsField>
          <SettingsField label="خط العرض"><input type="number" value={settings.latitude} onChange={(e) => updateSetting("latitude", Number(e.target.value))} className={input} dir="ltr" /></SettingsField>
          <SettingsField label="خط الطول"><input type="number" value={settings.longitude} onChange={(e) => updateSetting("longitude", Number(e.target.value))} className={input} dir="ltr" /></SettingsField>
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">التعرفة والعملة مصدرهما تبويب «المال» ومرتبطتان بجدول <bdi dir="ltr">EnergySettings</bdi>.</p>
      </SettingsSection>

      <SettingsSection icon="🧠" title="البيانات والذاكرة" subtitle="الاحتفاظ بالبيانات وتكرار القراءة">
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsField label="مدة حفظ السجل التاريخي"><select value={settings.retentionDays} onChange={(e) => updateSetting("retentionDays", Number(e.target.value))} className={input}><option value={30}>30 يوماً</option><option value={90}>90 يوماً</option><option value={180}>180 يوماً</option><option value={365}>365 يوماً</option><option value={0}>بلا حد</option></select></SettingsField>
          <SettingsField label="تكرار قراءة الإنفرتر"><select value={settings.pollIntervalSec} onChange={(e) => updateSetting("pollIntervalSec", Number(e.target.value))} className={input}><option value={5}>5 ثوانٍ</option><option value={10}>10 ثوانٍ</option><option value={30}>30 ثانية</option><option value={60}>60 ثانية</option></select></SettingsField>
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-500">التصدير والنسخ الاحتياطي ومسح السجل متاحة في قسم البيانات أدناه.</p>
      </SettingsSection>

      <SettingsSection icon="📤" title="البيانات وسجل النشاط" subtitle="تصدير القياسات ومراجعة العمليات ومسح السجل">
        <div className="flex flex-wrap gap-2">
          <a href="/api/settings/export" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">تصدير CSV</a>
          <button type="button" onClick={async () => { if (!window.confirm("سيتم حذف سجل القياسات التاريخية نهائياً. هل أنت متأكد؟")) return; const response = await fetch("/api/settings/export", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "مسح السجل" }) }); const data = await response.json().catch(() => ({})); if (!response.ok) setError(data.message || "تعذر مسح السجل."); else setMessage("تم مسح سجل القياسات التاريخية."); }} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">مسح السجل</button>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <h3 className="font-black">سجل النشاط</h3>
          {auditItems.length === 0 ? <p className="mt-2 text-xs font-semibold text-slate-500">لا توجد أحداث مرتبطة بحساب قاعدة البيانات الحالي.</p> :
            <div className="mt-3 max-h-72 space-y-2 overflow-auto">{auditItems.map((item) => <div key={item.id} className="rounded-xl bg-white p-3 text-sm"><strong>{item.action}</strong><div className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString("ar")} · {item.details || "—"}</div></div>)}</div>}
        </div>
      </SettingsSection>

      {error && <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-center text-sm font-black text-rose-700">{error}</div>}
      {message && <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-center text-sm font-black text-emerald-700">{message}</div>}

      {!draft && <button type="button" onClick={addInverter} className="min-h-14 w-full rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-lg">＋ أضف أول إنفرتر للبدء</button>}
      <div className="h-2" />
    </div>
  );
}
