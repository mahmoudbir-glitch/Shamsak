"use client";

import { useCallback, useState } from "react";

type WifiNetwork = {
  ssid: string;
  signal?: number;
  rssi?: number;
  secure?: boolean;
  auth?: string;
};

type PairingResult = {
  ssid: string;
  password: string;
};

type Props = {
  deviceBaseUrl?: string;
  scanPath?: string;
  configurePath?: string;
  apNameHint?: string;
  onComplete?: (result: PairingResult) => void;
};

const DEFAULT_BASE_URL = "http://192.168.4.1";
const DEFAULT_SCAN_PATH = "/wifi/scan";
const DEFAULT_CONFIGURE_PATH = "/wifi/configure";

export function InverterWifiPairing({
  deviceBaseUrl = DEFAULT_BASE_URL,
  scanPath = DEFAULT_SCAN_PATH,
  configurePath = DEFAULT_CONFIGURE_PATH,
  apNameHint = "Inverter-XXXX",
  onComplete,
}: Props) {
  const [step, setStep] = useState<"connect" | "networks" | "details" | "linking" | "done">("connect");
  const [baseUrl, setBaseUrl] = useState(deviceBaseUrl);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [selectedSsid, setSelectedSsid] = useState("");
  const [manualSsid, setManualSsid] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, "");

  const fetchNetworks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(normalizedBaseUrl + scanPath, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("scan_failed");
      const data = (await response.json()) as { networks?: unknown };
      const list = Array.isArray(data.networks)
        ? data.networks
            .map((item) => {
              const row = item as Record<string, unknown>;
              const ssid = typeof row.ssid === "string" ? row.ssid.trim() : "";
              if (!ssid) return null;
              return {
                ssid,
                signal: typeof row.signal === "number" ? row.signal : undefined,
                rssi: typeof row.rssi === "number" ? row.rssi : undefined,
                secure: typeof row.secure === "boolean" ? row.secure : undefined,
                auth: typeof row.auth === "string" ? row.auth : undefined,
              } satisfies WifiNetwork;
            })
            .filter(Boolean) as WifiNetwork[]
        : [];

      setNetworks(list);
      setStep("networks");
    } catch {
      setError("تعذر قراءة الشبكات من وحدة الإنفرتر. تأكد أن الهاتف متصل بنقطة اتصال الإنفرتر وأن عنوان الوحدة صحيح.");
    } finally {
      setLoading(false);
    }
  }, [normalizedBaseUrl, scanPath]);

  const sendCredentials = useCallback(async () => {
    const ssid = (selectedSsid || manualSsid).trim();
    if (!ssid || !password) {
      setError("أدخل اسم شبكة Wi‑Fi وكلمة المرور.");
      return;
    }

    setLoading(true);
    setError("");
    setStep("linking");

    try {
      const response = await fetch(normalizedBaseUrl + configurePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid, password }),
      });

      if (!response.ok) throw new Error("configure_failed");

      setStep("done");
      onComplete?.({ ssid, password });
    } catch {
      setStep("details");
      setError("لم تؤكد وحدة الإنفرتر قبول بيانات الشبكة. لا نعتبر الربط ناجحًا قبل وصول استجابة HTTP ناجحة.");
    } finally {
      setLoading(false);
    }
  }, [configurePath, manualSsid, normalizedBaseUrl, onComplete, password, selectedSsid]);

  return (
    <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4" dir="rtl">
      <div>
        <h3 className="text-lg font-black text-slate-900">📶 الاقتران المباشر بوحدة Wi‑Fi</h3>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
          هذه الخطوات تتصل بوحدة الـWi‑Fi المحلية، وليس بخادم شمسك مباشرة.
        </p>
      </div>

      {step === "connect" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-4 text-sm font-medium leading-7 text-slate-700">
            1. من إعدادات Wi‑Fi في الهاتف اتصل بنقطة اتصال الإنفرتر، مثل <b dir="ltr">{apNameHint}</b>.
            <br />
            2. ابقَ متصلًا بهذه الشبكة أثناء خطوة الفحص.
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">عنوان الوحدة المحلية</span>
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-left font-mono text-sm"
              dir="ltr"
              inputMode="url"
            />
          </label>
          <button
            type="button"
            onClick={() => void fetchNetworks()}
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-60"
          >
            {loading ? "جاري الفحص…" : "متصل، افحص الشبكات"}
          </button>
        </div>
      )}

      {step === "networks" && (
        <div className="space-y-3">
          <div className="max-h-64 space-y-2 overflow-auto">
            {networks.length === 0 && (
              <p className="rounded-xl bg-white p-4 text-sm font-medium text-slate-600">
                لم تُرجع الوحدة قائمة شبكات. يمكنك إدخال SSID يدويًا.
              </p>
            )}
            {networks.map((network) => (
              <button
                key={network.ssid}
                type="button"
                onClick={() => {
                  setSelectedSsid(network.ssid);
                  setManualSsid("");
                  setStep("details");
                  setError("");
                }}
                className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-right font-bold text-slate-800"
              >
                <span dir="ltr">{network.ssid}</span>
                <span className="text-xs text-slate-500">
                  {network.signal ?? network.rssi ?? "—"}
                  {network.secure === false ? " · مفتوحة" : " · محمية"}
                </span>
              </button>
            ))}
          </div>

          <input
            value={manualSsid}
            onChange={(event) => {
              setManualSsid(event.target.value);
              setSelectedSsid("");
            }}
            placeholder="أو اكتب SSID يدويًا"
            className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-left font-bold"
            dir="ltr"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => {
              if (manualSsid.trim()) setStep("details");
              else setError("اختر شبكة أو أدخل SSID يدويًا.");
            }}
            className="min-h-12 w-full rounded-xl bg-slate-900 px-4 font-bold text-white"
          >
            متابعة
          </button>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-4 text-sm font-bold text-slate-800">
            الشبكة: <span dir="ltr">{selectedSsid || manualSsid}</span>
          </div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="كلمة مرور Wi‑Fi"
            className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-left font-bold"
            dir="ltr"
            autoComplete="new-password"
          />
          {error && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">{error}</p>}
          <button
            type="button"
            onClick={() => void sendCredentials()}
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-60"
          >
            {loading ? "جاري إرسال بيانات الشبكة…" : "إرسال وربط Wi‑Fi"}
          </button>
        </div>
      )}

      {step === "linking" && (
        <div className="rounded-xl bg-white p-5 text-center">
          <div className="text-3xl">📡</div>
          <p className="mt-2 font-black text-slate-900">جاري ربط وحدة الإنفرتر بالشبكة…</p>
          <p className="mt-1 text-sm font-medium text-slate-500">قد تختفي نقطة اتصال الإنفرتر بعد نجاح الإعداد.</p>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-3 rounded-xl bg-emerald-50 p-5 text-center">
          <div className="text-3xl">✅</div>
          <p className="font-black text-emerald-800">تم تأكيد إرسال بيانات Wi‑Fi إلى الوحدة.</p>
          <p className="text-sm font-medium leading-6 text-emerald-700">
            الآن أعد اتصال الهاتف بشبكة المنزل، ثم اختبر وصول telemetry الحية من شمسك.
          </p>
        </div>
      )}

      {error && step === "connect" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">{error}</p>
      )}

      <p className="text-xs font-medium leading-5 text-slate-500">
        المسارات الافتراضية: <span dir="ltr">{scanPath}</span> و <span dir="ltr">{configurePath}</span>. إذا كانت وحدة Felicity تستخدم مسارات مختلفة، غيّرها هنا في الكود قبل الاختبار الفعلي.
      </p>
    </section>
  );
}
