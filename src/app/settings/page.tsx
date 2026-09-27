"use client";

import React, { useEffect, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { InverterWifiPairing } from "@/components/inverter-wifi-pairing";

type InverterModel = "Deye" | "Voltronic" | "Growatt" | "Felicity" | "غير ذلك";
type Protocol = "Modbus RTU" | "Modbus TCP" | "Wi-Fi Datalogger";

export default function SettingsPage() {
  const [panelCapacity, setPanelCapacity] = useState(6);
  const [batteryCapacity, setBatteryCapacity] = useState(4800);
  const [inverterModel, setInverterModel] = useState<InverterModel>("Felicity");
  const [protocol, setProtocol] = useState<Protocol>("Modbus RTU");
  const [inverterAddress, setInverterAddress] = useState("");
  const [systemName, setSystemName] = useState("منظومة شمسك");
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [saved, setSaved] = useState(false);
  const [latitude, setLatitude] = useState(33.8938);
  const [longitude, setLongitude] = useState(35.5018);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    void fetch("/api/inverter/connection", { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json()) as { connection?: { systemName?: string; inverterAddress?: string; wifiSsid?: string; hasWifiPassword?: boolean } } : null)
      .then((data) => {
        const row = data?.connection;
        if (!row) return;
        if (row.systemName) setSystemName(row.systemName);
        if (row.inverterAddress) setInverterAddress(row.inverterAddress);
        if (row.wifiSsid) setWifiSsid(row.wifiSsid);
        if (row.hasWifiPassword) setWifiPassword("");
      })
      .catch(() => {});

    const saved = {
      panels: localStorage.getItem("shamsak_panel_capacity"),
      battery: localStorage.getItem("shamsak_battery_capacity"),
      model: localStorage.getItem("shamsak_inverter_model"),
      protocol: localStorage.getItem("shamsak_protocol"),
      address: localStorage.getItem("shamsak_inverter_address"),
      systemName: localStorage.getItem("shamsak_system_name"),
      ssid: localStorage.getItem("shamsak_wifi_ssid"),
      latitude: localStorage.getItem("shamsak_latitude"),
      longitude: localStorage.getItem("shamsak_longitude"),
    };
    if (saved.panels) setPanelCapacity(Number(saved.panels));
    if (saved.battery) setBatteryCapacity(Number(saved.battery));
    if (saved.model) setInverterModel(saved.model as InverterModel);
    if (saved.protocol) setProtocol(saved.protocol as Protocol);
    if (saved.address) setInverterAddress(saved.address);
    if (saved.systemName) setSystemName(saved.systemName);
    if (saved.ssid) setWifiSsid(saved.ssid);
    if (saved.latitude) setLatitude(Number(saved.latitude));
    if (saved.longitude) setLongitude(Number(saved.longitude));
  }, []);

  const handleSaveSettings = async () => {
    localStorage.setItem("shamsak_panel_capacity", String(panelCapacity));
    localStorage.setItem("shamsak_battery_capacity", String(batteryCapacity));
    localStorage.setItem("shamsak_inverter_model", inverterModel);
    localStorage.setItem("shamsak_protocol", protocol);
    localStorage.setItem("shamsak_inverter_address", inverterAddress);
    localStorage.setItem("shamsak_system_name", systemName);
    localStorage.setItem("shamsak_wifi_ssid", wifiSsid);
    try {
      const response = await fetch("/api/inverter/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemName,
          inverterModel,
          protocol,
          inverterAddress,
          wifiSsid,
          wifiPassword,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      setSaved(true);
    } catch {
      setSaved(false);
      window.alert("تعذر حفظ إعدادات ربط الإنفرتر على الخادم. تحقق من اتصال قاعدة البيانات.");
      return;
    }
    localStorage.setItem("shamsak_latitude", String(latitude));
    localStorage.setItem("shamsak_longitude", String(longitude));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const testNetwork = async () => {
    setNetworkStatus("testing");
    setConnectionState("connecting");
    try {
      const response = await fetch("/api/telemetry", { cache: "no-store" });
      if (!response.ok) throw new Error("telemetry_unavailable");
      const data = (await response.json()) as { source?: string; snapshot?: { source?: string } };
      const source = data.snapshot?.source ?? data.source;
      if (source === "live") {
        setNetworkStatus("success");
        setConnectionState("connected");
      } else {
        setNetworkStatus("error");
        setConnectionState("error");
      }
    } catch {
      setNetworkStatus("error");
      setConnectionState("error");
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setLocationStatus("error"); return; }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => { setLatitude(Number(position.coords.latitude.toFixed(6))); setLongitude(Number(position.coords.longitude.toFixed(6))); setLocationStatus("success"); },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const inputClass = "w-full min-h-12 rounded-xl border border-slate-200 bg-indigo-50/60 px-4 text-base font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const selectClass = inputClass + " appearance-auto";

  return (
    <div className="w-full space-y-5 rounded-[2rem] bg-gradient-to-b from-indigo-50/55 via-white/40 to-white/20 p-2 pb-4 text-right sm:p-3" dir="rtl">
      <div className="energy-card border-blue-100 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">🔌 إضافة إنفرتر جديد</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">ابدأ إعداد الجهاز خطوة بخطوة.</p>
          </div>
          <button type="button" onClick={() => { window.location.href = "/settings/inverter/new"; }} className="min-h-11 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-sm transition active:scale-95 hover:bg-blue-700">إضافة إنفرتر</button>
        </div>
      </div>

      <div className="energy-card p-4 sm:p-5">
        <h1 className="flex items-center gap-2 text-xl font-black sm:text-2xl text-slate-900">⚙️ إعدادات منظومة شمسك</h1>
        <p className="mt-2 text-base font-medium text-slate-500">تهيئة المنظومة والاتصال والذاكرة</p>
      </div>

      <div className="energy-card space-y-4 p-4 sm:p-5">
        <h2 className="border-b border-slate-100 pb-3 text-lg font-black text-slate-900 sm:text-xl font-bold">📊 مواصفات العتاد (Hardware)</h2>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">إجمالي قدرة الألواح الموصولة</label>
          <div className="flex items-center gap-2">
            <input type="number" value={panelCapacity} onChange={(e) => setPanelCapacity(Number(e.target.value))} className={inputClass + " text-center"} />
            <span className="text-base font-bold text-slate-500">kW</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">سعة خزان البطاريات الإجمالية</label>
          <div className="flex items-center gap-2">
            <input type="number" value={batteryCapacity} onChange={(e) => setBatteryCapacity(Number(e.target.value))} className={inputClass + " text-center"} />
            <span className="text-base font-bold text-slate-500">Wh</span>
          </div>
        </div>
      </div>

      <div className="energy-card mb-4 space-y-4 p-5">
        <h2 className="border-b border-slate-100 pb-3 text-xl font-bold text-slate-900">⚡ إعدادات الإنفرتر (Inverter Configuration)</h2>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">نوع / موديل الإنفرتر</label>
          <select value={inverterModel} onChange={(e) => setInverterModel(e.target.value as InverterModel)} className={selectClass}>
            <option>Deye</option><option>Voltronic</option><option>Growatt</option><option>Felicity</option><option>غير ذلك</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">بروتوكول الاتصال</label>
          <select value={protocol} onChange={(e) => setProtocol(e.target.value as Protocol)} className={selectClass}>
            <option>Modbus RTU</option><option>Modbus TCP</option><option>Wi-Fi Datalogger</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">{protocol === "Modbus TCP" ? "عنوان IP للإنفرتر" : protocol === "Modbus RTU" ? "عنوان / منفذ الاتصال التسلسلي" : "عنوان جهاز الـDatalogger (إن وُجد)"}</label>
          <input type="text" value={inverterAddress} onChange={(e) => setInverterAddress(e.target.value)} placeholder={protocol === "Modbus TCP" ? "مثال: 192.168.1.50" : protocol === "Modbus RTU" ? "مثال: COM3 أو /dev/ttyUSB0" : "مثال: عنوان الجهاز أو الرقم التسلسلي"} className={inputClass} dir="ltr" />
        </div>
      </div>

      {protocol === "Wi-Fi Datalogger" && (
        <div className="energy-card space-y-5 border-blue-100 p-4 sm:p-5">
          <div>
            <h2 className="border-b border-slate-100 pb-3 text-xl font-bold text-slate-900">📶 ربط الإنفرتر عبر Wi‑Fi</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">أدخل بيانات الشبكة وكلمة مرور Wi‑Fi. تُستخدم هذه الإعدادات كملف ربط للبوابة أو الدونغل الذي يرسل القراءات إلى شمسك.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-base font-semibold text-slate-700">اسم المنظومة</label><input value={systemName} onChange={(e) => setSystemName(e.target.value)} placeholder="منظومة شمسك" className={inputClass} /></div>
            <div className="space-y-2"><label className="text-base font-semibold text-slate-700">اسم شبكة المنزل (SSID)</label><input value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="MyHomeWiFi" className={inputClass} dir="ltr" autoComplete="off" /></div>
            <div className="space-y-2"><label className="text-base font-semibold text-slate-700">كلمة مرور Wi‑Fi</label><div className="relative"><input type={showPassword ? "text" : "password"} value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder="••••••••" className={inputClass + " pl-20"} dir="ltr" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50">{showPassword ? "إخفاء" : "إظهار"}</button></div></div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium leading-6 text-amber-800">⚠️ المتصفح وحده لا يستطيع برمجة شبكة Wi‑Fi للإنفرتر أو اكتشاف أجهزة Wi‑Fi القريبة بشكل عام. الربط اللاسلكي الحقيقي يحتاج Wi‑Fi dongle/بوابة تدعم بروتوكول الإنفرتر أو خدمة وسيطة.</div>
          <InverterWifiPairing
            onComplete={({ ssid, password }) => {
              setWifiSsid(ssid);
              setWifiPassword("");
              setNetworkStatus("success");
              setConnectionState("connecting");
              void fetch("/api/inverter/connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  systemName,
                  inverterModel,
                  protocol,
                  inverterAddress,
                  wifiSsid: ssid,
                  wifiPassword: password,
                }),
              }).then(async (response) => {
                if (!response.ok) throw new Error("save_failed");
                setSaved(true);
                window.setTimeout(() => setSaved(false), 3000);
              }).catch(() => {
                setNetworkStatus("error");
                window.alert("تم إرسال بيانات Wi‑Fi إلى الوحدة، لكن تعذر حفظها في خادم شمسك.");
              });
            }}
          />
          <div className="flex items-center justify-between gap-3"><span className="text-base font-black text-slate-800">اختبار وصول القراءات الحية</span><InfoTip label="شرح حالة الاتصال" title="حالة اتصال الإنفرتر"><span>يعتبر الاختبار ناجحًا فقط عندما تصل قراءة telemetry مصدرها live. وجود إعدادات Wi‑Fi محفوظة لا يعني أن الإنفرتر متصل فعليًا.</span></InfoTip></div>
          <button type="button" onClick={() => void testNetwork()} disabled={connectionState === "connecting"} className="min-h-14 w-full rounded-xl bg-blue-600 px-4 text-lg font-bold text-white shadow-sm transition active:scale-95 hover:bg-blue-700 disabled:opacity-60">{connectionState === "connecting" ? "جاري الاتصال والتحقق…" : "اتصال واختبار الإنفرتر"}</button>
          {connectionState === "connected" && <p className="rounded-xl bg-emerald-50 p-3 text-base font-bold text-emerald-700">✓ الاتصال ناجح — وصلت بيانات حية من الإنفرتر.</p>}
          {connectionState === "error" && <p className="rounded-xl bg-amber-50 p-3 text-base font-bold text-amber-700">⚠️ لم تصل قراءة حية بعد. احفظ الإعدادات وتحقق من الدونغل/البوابة وبروتوكول الاتصال.</p>}
          <div className="rounded-xl bg-indigo-50/60 p-3 text-sm font-semibold text-slate-600">الحالة الحالية: {connectionState === "connected" ? "متصل" : connectionState === "connecting" ? "جاري الاتصال" : "غير متصل"}</div>
        </div>
      )}
    </div>
  );
}