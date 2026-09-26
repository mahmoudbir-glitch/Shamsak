"use client";

import React,{useState} from "react";
import {Eye,EyeOff,Lock,User} from "lucide-react";
import {useRouter} from "next/navigation";

export default function LoginForm(){
  const router=useRouter();
  const [showPassword,setShowPassword]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function handleSubmit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true); setError("");
    const form=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        username:String(form.get("username")||"").trim(),
        password:String(form.get("password")||"")
      })});
      const data=(await response.json()) as {error?:string};
      if(!response.ok){
        setError(response.status===429?"تم تجاوز عدد محاولات الدخول. حاول لاحقًا.":data.error==="auth_not_configured"?"نظام الدخول غير مهيأ بعد.":"اسم المستخدم أو كلمة المرور غير صحيحة.");
        return;
      }
      router.replace("/"); router.refresh();
    }catch{setError("تعذر الاتصال بخادم تسجيل الدخول.");}
    finally{setLoading(false);}
  }

  return <form onSubmit={handleSubmit} dir="rtl" className="w-full space-y-4">
    <div className="relative">
      <User size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
      <input name="username" type="text" placeholder="اسم المستخدم" autoComplete="username" required disabled={loading}
        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-11 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"/>
    </div>
    <div className="relative">
      <Lock size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
      <input name="password" type={showPassword?"text":"password"} placeholder="كلمة المرور" autoComplete="current-password" required disabled={loading}
        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-11 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"/>
      <button type="button" onClick={()=>setShowPassword(v=>!v)} disabled={loading}
        aria-label={showPassword?"إخفاء كلمة المرور":"إظهار كلمة المرور"}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
        {showPassword?<EyeOff size={20}/>:<Eye size={20}/>}
      </button>
    </div>
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
    <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
      {loading?"جاري تسجيل الدخول...":"تسجيل الدخول"}
    </button>
  </form>;
}
