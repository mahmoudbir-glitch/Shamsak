"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton(){
  const router=useRouter();
  const [loading,setLoading]=useState(false);
  async function logout(){
    setLoading(true);
    try{await fetch("/api/auth/logout",{method:"POST"});}finally{
      router.replace("/login");
      router.refresh();
    }
  }
  return <button type="button" onClick={()=>void logout()} disabled={loading} aria-label="تسجيل الخروج"
    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-red-600 disabled:opacity-50">
    <LogOut size={18}/><span>{loading?"...":"خروج"}</span>
  </button>;
}
