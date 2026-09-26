"use client";

import React, { useEffect, useState } from "react";

type InverterModel = "Deye" | "Voltronic" | "Growatt" | "Felicity" | "غير ذلك";
type Protocol = "Modbus RTU" | "Modbus TCP" | "Wi-Fi Datalogger";

export default function SettingsPage() {
  const [panelCapacity, setPanelCapacity] = useState(6);
  const [batteryCapacity, setBatteryCapacity] = useState(4800);
  const [currency, setCurrency] = useState("ل.س");
  const [notifySurplus, setNotifySurplus] = useState(true);
  const [notifyLowBattery, setNotifyLowBattery] = useState(true);
  const [inverterModel, setInverterModel] = useState<InverterModel>("Felicity");
  const [protocol, setProtocol] = useState<Protocol>("Modbus RTU");
  const [inverterAddress, setInverterAddress] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  useEffect(() => {
    const saved = {
      panels: localStorage.getItem("shamsak_panel_capacity"),
      battery: localStorage.getItem("shamsak_battery_capacity"),
      currency: localStorage.getItem("shamsak_currency"),
      model: localStorage.getItem("shamsak_inverter_model"),
      protocol: localStorage.getItem("shamsak_protocol"),
      address: localStorage.getItem("shamsak_inverter_address"),
      ssid: localStorage.getItem("shamsak_wifi_ssid"),
      password: localStorage.getItem("shamsak_wifi_password"),
    };
    if (saved.panels) setPanelCapacity(Number(saved.panels));
    if (saved.battery) setBatteryCapacity(Number(saved.battery));
    if (saved.currency) setCurrency(saved.currency);
    if (saved.model) setInverterModel(saved.model as InverterModel);
    if (saved.protocol) setProtocol(saved.protocol as Protocol);
    if (saved.address) setInverterAddress(saved.address);
    if (saved.ssid) setWifiSsid(saved.ssid);
    if (saved.password) setWifiPassword(saved.password);
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("shamsak_panel_capacity", String(panelCapacity));
    localStorage.setItem("shamsak_battery_capacity", String(batteryCapacity));
    localStorage.setItem("shamsak_currency", currency);
    localStorage.setItem("shamsak_inverter_model", inverterModel);
    localStorage.setItem("shamsak_protocol", protocol);
    localStorage.setItem("shamsak_inverter_address", inverterAddress);
    localStorage.setItem("shamsak_wifi_ssid", wifiSsid);
    localStorage.setItem("shamsak_wifi_password", wifiPassword);
    alert("تم حفظ إعدادات شمسك بنجاح! ✅");
  };

  const testNetwork = async () => {
    setNetworkStatus("testing");
    try {
      const response = await fetch("/api/telemetry", { cache: "no-store" });
      setNetworkStatus(response.ok ? "success" : "error");
    } catch {
      setNetworkStatus("error");
    }
  };

  const inputClass = "w-full min-h-14 rounded-xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const selectClass = inputClass + " appearance-auto";

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-28 text-right" dir="rtl">
      <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">⚙️ إعدادات منظومة شمسك</h1>
        <p className="mt-2 text-base font-medium text-slate-500">تهيئة المنظومة والاتصال والذاكرة</p>
      </div>

      <div className="mb-5 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-xl font-bold text-slate-900">📊 مواصفات العتاد (Hardware)</h2>
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

      <div className="mb-5 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
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
          <label className="text-base font-semibold text-slate-700">عنوان IP أو الرقم التسلسلي</label>
          <input type="text" value={inverterAddress} onChange={(e) => setInverterAddress(e.target.value)} placeholder="192.168.1.50 أو الرقم التسلسلي" className={inputClass} dir="ltr" />
        </div>
      </div>

      <div className="mb-5 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-xl font-bold text-slate-900">📶 إعدادات الواي فاي والاتصال (Wi-Fi Configuration)</h2>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">اسم شبكة الواي فاي (Wi-Fi SSID)</label>
          <input type="text" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="اسم شبكة المنزل" className={inputClass} dir="ltr" />
        </div>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">كلمة مرور الشبكة (Password)</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder="••••••••" className={inputClass + " pl-20"} dir="ltr" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50">
              {showPassword ? "إخفاء" : "إظهار"}
            </button>
          </div>
        </div>
        <button type="button" onClick={() => void testNetwork()} disabled={networkStatus === "testing"} className="min-h-14 w-full rounded-xl bg-blue-50 px-4 text-lg font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60">
          {networkStatus === "testing" ? "جاري اختبار الاتصال…" : "اختبار الاتصال بالشبكة"}
        </button>
        {networkStatus === "success" && <p className="rounded-xl bg-emerald-50 p-3 text-base font-bold text-emerald-700">✓ تم الوصول إلى قناة البيانات الحية.</p>}
        {networkStatus === "error" && <p className="rounded-xl bg-amber-50 p-3 text-base font-bold text-amber-700">⚠️ تعذر الوصول إلى بيانات الإنفرتر الحية. تأكد من الاتصال وإعدادات الجهاز.</p>}
      </div>

      <div className="mb-5 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-xl font-bold text-slate-900">💰 التفضيلات المالية</h2>
        <div className="space-y-2">
          <label className="text-base font-semibold text-slate-700">العملة المحلية لحساب التوفير</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
            <option value="ل.س">ليرة سورية (ل.س)</option><option value="USD">دولار أمريكي ($)</option><option value="LBP">ليرة لبنانية (L.B.P)</option>
          </select>
        </div>
      </div>

      <div className="mb-6 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="border-b border-slate-100 pb-3 text-xl font-bold text-slate-900">🔔 التنبيهات</h2>
        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700">
          <span>تنبيهي عند وجود فائض طاقة غير مستغل</span>
          <input type="checkbox" checked={notifySurplus} onChange={(e) => setNotifySurplus(e.target.checked)} className="h-7 w-7 shrink-0 accent-amber-500" />
        </label>
        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700">
          <span>تنبيهي عند اقتراب البطارية من حد الأمان (10%)</span>
          <input type="checkbox" checked={notifyLowBattery} onChange={(e) => setNotifyLowBattery(e.target.checked)} className="h-7 w-7 shrink-0 accent-emerald-500" />
        </label>
      </div>

      <button onClick={handleSaveSettings} className="mb-4 min-h-16 w-full rounded-2xl bg-slate-900 px-5 py-4 text-lg font-bold text-white shadow-md transition active:bg-slate-800">
        حفظ وتثبيت الإعدادات في ذاكرة الهاتف
      </button>
    </div>
  );
}
