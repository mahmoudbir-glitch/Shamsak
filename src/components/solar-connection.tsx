'use client';

import { useEffect, useState } from "react";
import { Cable, CheckCircle2, CircleAlert, Loader2, Save, ShieldCheck, Wifi } from "lucide-react";
import {
  defaultConnection,
  protocolLabels,
  sanitizeConnection,
  type ConnectionProtocol,
  type InverterConnectionConfig,
} from "@/lib/inverter-connection";

const STORAGE_KEY = "shamsak-inverter-connection";

export function SolarConnection() {
  const [config, setConfig] = useState<InverterConnectionConfig>(defaultConnection);
  const [status, setStatus] = useState<"not-configured" | "testing" | "connected" | "failed">("not-configured");
  const [message, setMessage] = useState("لم يتم اختبار الاتصال بعد.");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig(sanitizeConnection(JSON.parse(raw)));
    } catch {
      setMessage("تعذر قراءة إعدادات الربط المحلية.");
    }
  }, []);

  const update = (patch: Partial<InverterConnectionConfig>) => {
    setConfig((current) => sanitizeConnection({ ...current, ...patch }));
    setStatus("not-configured");
    setMessage("تم تعديل الإعدادات. اختبر الاتصال قبل اعتبار المنظومة متصلة.");
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const testConnection = async () => {
    setStatus("testing");
    setMessage("جارٍ التحقق من الإعدادات… لا يتم اعتبار الاتصال ناجحًا قبل وصول استجابة حقيقية.");
    try {
      const response = await fetch("/api/connection/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setStatus("connected");
        setMessage(data.message || "تم التحقق من الاتصال.");
      } else {
        setStatus("failed");
        setMessage(data.message || "لم يثبت نجاح الاتصال.");
      }
    } catch {
      setStatus("failed");
      setMessage("تعذر تنفيذ اختبار الاتصال. لم يتم اعتبار المنظومة متصلة.");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="solar-connection-title">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><Cable aria-hidden="true" size={22} /></div>
        <div className="min-w-0">
          <h2 id="solar-connection-title" className="text-lg font-extrabold">ربط المنظومة الشمسية</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            اختر نوع الاتصال الفعلي لجهازك. لا يفترض شمسك بروتوكولًا واحدًا لكل أجهزة الانفرتر.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          <span>البروتوكول</span>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"
            value={config.protocol}
            onChange={(e) => update({ protocol: e.target.value as ConnectionProtocol })}
          >
            {Object.entries(protocolLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="space-y-1 text-sm font-semibold">
          <span>الشركة المصنّعة (اختياري)</span>
          <input className="w-full rounded-xl border border-slate-200 p-3 font-normal" value={config.manufacturer || ""} onChange={(e) => update({ manufacturer: e.target.value })} placeholder="مثال: Felicity Solar" />
        </label>

        <label className="space-y-1 text-sm font-semibold">
          <span>موديل الانفرتر (اختياري)</span>
          <input className="w-full rounded-xl border border-slate-200 p-3 font-normal" value={config.model || ""} onChange={(e) => update({ model: e.target.value })} placeholder="رقم الموديل" />
        </label>

        <label className="space-y-1 text-sm font-semibold">
          <span>العنوان / Endpoint</span>
          <input className="w-full rounded-xl border border-slate-200 p-3 font-normal" value={config.endpoint || ""} onChange={(e) => update({ endpoint: e.target.value })} placeholder="https://… أو عنوان البوابة" dir="ltr" />
        </label>

        <label className="space-y-1 text-sm font-semibold">
          <span>المنفذ (إن لزم)</span>
          <input className="w-full rounded-xl border border-slate-200 p-3 font-normal" inputMode="numeric" type="number" min="1" max="65535" value={config.port ?? ""} onChange={(e) => update({ port: e.target.value ? Number(e.target.value) : undefined })} placeholder="اختياري" />
        </label>

        <label className="space-y-1 text-sm font-semibold">
          <span>فترة تحديث القراءات بالثواني</span>
          <input className="w-full rounded-xl border border-slate-200 p-3 font-normal" inputMode="numeric" type="number" min="2" max="300" value={config.refreshSeconds} onChange={(e) => update({ refreshSeconds: Number(e.target.value) })} />
        </label>
      </div>

      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
        <span>
          <strong className="block">تفعيل مصدر الطاقة</strong>
          <span className="text-slate-500">لن تعرض الواجهة بيانات Live لمجرد تفعيل هذا الخيار.</span>
        </span>
        <input type="checkbox" checked={config.enabled} onChange={(e) => update({ enabled: e.target.checked })} className="h-5 w-5" />
      </label>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          {status === "testing" && <Loader2 className="animate-spin text-blue-600" size={18} />}
          {status === "connected" && <CheckCircle2 className="text-emerald-600" size={18} />}
          {status === "failed" && <CircleAlert className="text-red-600" size={18} />}
          {status === "not-configured" && <ShieldCheck className="text-slate-500" size={18} />}
          حالة الاتصال
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={testConnection} disabled={status === "testing"} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition active:scale-95 disabled:opacity-60">
          <Wifi size={17} /> اختبار الاتصال
        </button>
        <button type="button" onClick={save} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 transition active:scale-95">
          <Save size={17} /> حفظ إعدادات الربط
        </button>
      </div>

      {saved && <p className="mt-3 text-center text-sm font-bold text-emerald-700">تم حفظ إعدادات الربط على هذا الجهاز.</p>}
    </section>
  );
}
