"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn, Sun } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "بيانات تسجيل الدخول غير صحيحة.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") ? next : "/");
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.10)] sm:p-8" aria-labelledby="login-title">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <Sun size={34} aria-hidden="true" />
          </div>
          <h1 id="login-title" className="mt-5 text-2xl font-black text-slate-900">شمسك</h1>
          <p className="mt-2 text-sm text-slate-500">إدارة ومراقبة الطاقة الشمسية في منزلك</p>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">اسم المستخدم</span>
            <input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" dir="ltr" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">كلمة المرور</span>
            <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" dir="ltr" />
          </label>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? <LockKeyhole size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
            {loading ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
          </button>
        </form>
      </section>
    </main>
  );
}
