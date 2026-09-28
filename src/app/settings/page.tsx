"use client";

import React, { useEffect, useState } from "react";

type Model = "Deye" | "Voltronic" | "Growatt" | "Felicity" | "غير ذلك";
type Protocol = "Modbus RTU" | "Modbus TCP" | "Wi-Fi Datalogger";
type InverterConnectionResponse = { systemName?: string; inverterModel?: string; protocol?: string; inverterAddress?: string; serialPort?: string; port?: number; baudRate?: number; dataBits?: number; stopBits?: number; parity?: "N"|"E"|"O"; slaveId?: number; timeoutMs?: number; pollingIntervalMs?: number; gatewayUrl?: string; wifiSsid?: string; hasWifiPassword?: boolean; lastStatus?: string; lastSeenAt?: string | null; };

export default function SettingsPage() {
  const [model,setModel]=useState<Model>("Felicity");
  const [protocol,setProtocol]=useState<Protocol>("Modbus RTU");
  const [address,setAddress]=useState("");
  const [serialPort,setSerialPort]=useState("");
  const [port,setPort]=useState(502);
  const [baudRate,setBaudRate]=useState(9600);
  const [dataBits,setDataBits]=useState(8);
  const [stopBits,setStopBits]=useState(1);
  const [parity,setParity]=useState<"N"|"E"|"O">("N");
  const [slaveId,setSlaveId]=useState(1);
  const [timeoutMs,setTimeoutMs]=useState(3000);
  const [pollingMs,setPollingMs]=useState(10000);
  const [gatewayUrl,setGatewayUrl]=useState("");
  const [panelCapacity,setPanelCapacity]=useState(6);
  const [batteryCapacity,setBatteryCapacity]=useState(4800);
  const [systemName,setSystemName]=useState("منظومة شمسك");
  const [status,setStatus]=useState<"unknown"|"testing"|"connected"|"error">("unknown");
  const [message,setMessage]=useState("");
  const [saved,setSaved]=useState(false);

  useEffect(()=>{ void fetch("/api/inverter/connection",{cache:"no-store"}).then(r=>r.ok?r.json():null).then((d)=>{
    const c = d?.connection as InverterConnectionResponse | undefined; if(!c)return;
    if(c.systemName)setSystemName(c.systemName);
    if(c.inverterModel)setModel(c.inverterModel as Model);
    if(c.protocol)setProtocol(c.protocol as Protocol);
    if(c.inverterAddress)setAddress(c.inverterAddress);
    if(c.serialPort)setSerialPort(c.serialPort);
    if(c.port)setPort(c.port); if(c.baudRate)setBaudRate(c.baudRate);
    if(c.dataBits)setDataBits(c.dataBits); if(c.stopBits)setStopBits(c.stopBits);
    if(c.parity)setParity(c.parity); if(c.slaveId)setSlaveId(c.slaveId);
    if(c.timeoutMs)setTimeoutMs(c.timeoutMs); if(c.pollingIntervalMs)setPollingMs(c.pollingIntervalMs);
    if(c.gatewayUrl)setGatewayUrl(c.gatewayUrl);
    if(c.lastStatus==="connected")setStatus("connected");
  }).catch(()=>{}); },[]);

  const save=async()=>{
    setSaved(false);
    const r=await fetch("/api/inverter/connection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      systemName,inverterModel:model,manufacturer:model==="Felicity"?"Felicity":model,protocol,inverterAddress:address,
      serialPort,port,baudRate,dataBits,stopBits,parity,slaveId,timeoutMs,pollingIntervalMs,gatewayUrl,
      panelCapacityKw:panelCapacity,batteryCapacityWh:batteryCapacity
    })});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setMessage(d.message||d.error||"تعذر حفظ الإعدادات");return;}
    setSaved(true);setMessage("تم حفظ إعدادات الاتصال بنجاح");setTimeout(()=>setSaved(false),2500);
  };

  const test=async()=>{
    setStatus("testing");setMessage("جاري اختبار الاتصال الفعلي…");
    try{
      const r=await fetch("/api/inverter/test",{method:"POST",cache:"no-store"});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok)throw new Error(d.message||d.error||"فشل الاتصال");
      setStatus("connected");
      setMessage(d.source==="mock"?"✓ وضع MOCK يعمل بنجاح — لا يوجد اتصال عتادي فعلي.":`✓ الاتصال ناجح عبر البوابة — زمن الاستجابة ${d.latencyMs??"—"}ms`);
    }catch(e){setStatus("error");setMessage(e instanceof Error?e.message:"تعذر اختبار الاتصال");}
  };

  const input="w-full min-h-12 rounded-xl border border-slate-200 bg-indigo-50/60 px-4 font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  return <div dir="rtl" className="w-full space-y-5 rounded-[2rem] bg-gradient-to-b from-indigo-50/55 via-white/40 to-white/20 p-3 pb-6">
    <div className="energy-card p-5"><h1 className="text-2xl font-black text-slate-900">⚙️ إعدادات منظومة شمسك</h1><p className="mt-2 font-medium text-slate-500">تهيئة المنظومة والاتصال والذاكرة والقراءات الحية.</p></div>

    <div className="energy-card space-y-4 border-blue-100 p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">📡 اتصال الإنفرتر</h2><p className="mt-1 text-sm font-medium text-slate-500">هذا الاختبار يتصل بالـLocal Gateway بدل محاولة فتح منفذ COM من Vercel.</p></div>
      <span className={`rounded-full px-3 py-1.5 text-sm font-black ${status==="connected"?"bg-emerald-100 text-emerald-700":status==="error"?"bg-rose-100 text-rose-700":status==="testing"?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600"}`}>{status==="connected"?"متصل":status==="error"?"فشل":status==="testing"?"جاري الاختبار":"غير معروف"}</span></div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2"><span className="font-bold">نوع / موديل الإنفرتر</span><select value={model} onChange={e=>setModel(e.target.value as Model)} className={input}><option>Deye</option><option>Voltronic</option><option>Growatt</option><option>Felicity</option><option>غير ذلك</option></select></label>
        <label className="space-y-2"><span className="font-bold">طريقة الاتصال</span><select value={protocol} onChange={e=>setProtocol(e.target.value as Protocol)} className={input}><option>Modbus RTU</option><option>Modbus TCP</option><option>Wi-Fi Datalogger</option></select></label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2"><span className="font-bold">{protocol==="Modbus TCP"?"IP Address":"Serial Port"}</span><input value={protocol==="Modbus TCP"?address:serialPort} onChange={e=>protocol==="Modbus TCP"?setAddress(e.target.value):setSerialPort(e.target.value)} placeholder={protocol==="Modbus TCP"?"192.168.1.50":"COM3 أو /dev/ttyUSB0"} className={input} dir="ltr"/></label>
        <label className="space-y-2"><span className="font-bold">{protocol==="Modbus TCP"?"TCP Port":"Slave ID"}</span><input type="number" value={protocol==="Modbus TCP"?port:slaveId} onChange={e=>protocol==="Modbus TCP"?setPort(Number(e.target.value)):setSlaveId(Number(e.target.value))} className={input} dir="ltr"/></label>
      </div>

      {protocol==="Modbus RTU" && <div className="grid gap-4 sm:grid-cols-4">
        <label className="space-y-2"><span className="font-bold">Baud Rate</span><select value={baudRate} onChange={e=>setBaudRate(Number(e.target.value))} className={input}><option value={2400}>2400</option><option value={4800}>4800</option><option value={9600}>9600</option><option value={19200}>19200</option><option value={38400}>38400</option><option value={115200}>115200</option></select></label>
        <label className="space-y-2"><span className="font-bold">Data Bits</span><select value={dataBits} onChange={e=>setDataBits(Number(e.target.value))} className={input}><option value={8}>8</option><option value={7}>7</option></select></label>
        <label className="space-y-2"><span className="font-bold">Stop Bits</span><select value={stopBits} onChange={e=>setStopBits(Number(e.target.value))} className={input}><option value={1}>1</option><option value={2}>2</option></select></label>
        <label className="space-y-2"><span className="font-bold">Parity</span><select value={parity} onChange={e=>setParity(e.target.value as "N"|"E"|"O")} className={input}><option value="N">None</option><option value="E">Even</option><option value="O">Odd</option></select></label>
      </div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2"><span className="font-bold">Slave ID</span><input type="number" min={1} max={247} value={slaveId} onChange={e=>setSlaveId(Number(e.target.value))} className={input} dir="ltr"/></label>
        <label className="space-y-2"><span className="font-bold">Timeout (ms)</span><input type="number" value={timeoutMs} onChange={e=>setTimeoutMs(Number(e.target.value))} className={input} dir="ltr"/></label>
        <label className="space-y-2"><span className="font-bold">Polling (ms)</span><input type="number" value={pollingMs} onChange={e=>setPollingMs(Number(e.target.value))} className={input} dir="ltr"/></label>
      </div>

      <label className="space-y-2 block"><span className="font-bold">عنوان Local Gateway</span><input value={gatewayUrl} onChange={e=>setGatewayUrl(e.target.value)} placeholder="http://192.168.1.100:8787" className={input} dir="ltr"/></label>

      {message && <div className={`rounded-xl p-3 font-bold ${status==="connected"?"bg-emerald-50 text-emerald-700":status==="error"?"bg-rose-50 text-rose-700":"bg-indigo-50 text-slate-700"}`}>{message}</div>}
      <div className="grid gap-3 sm:grid-cols-2"><button onClick={()=>void save()} className="min-h-14 rounded-xl bg-blue-600 px-5 text-lg font-black text-white">{saved?"✓ تم الحفظ":"💾 حفظ إعدادات الاتصال"}</button><button onClick={()=>void test()} disabled={status==="testing"} className="min-h-14 rounded-xl bg-slate-900 px-5 text-lg font-black text-white disabled:opacity-60">{status==="testing"?"جاري الاختبار…":"🔌 اختبار الاتصال بالإنفرتر"}</button></div>
    </div>

    <div className="energy-card space-y-4 p-5"><h2 className="text-xl font-black">📊 مواصفات العتاد</h2>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-bold">إجمالي قدرة الألواح (kW)</span><input type="number" value={panelCapacity} onChange={e=>setPanelCapacity(Number(e.target.value))} className={input}/></label><label className="space-y-2"><span className="font-bold">سعة البطاريات (Wh)</span><input type="number" value={batteryCapacity} onChange={e=>setBatteryCapacity(Number(e.target.value))} className={input}/></label></div>
      <label className="space-y-2 block"><span className="font-bold">اسم المنظومة</span><input value={systemName} onChange={e=>setSystemName(e.target.value)} className={input}/></label>
    </div>
  </div>;
}
