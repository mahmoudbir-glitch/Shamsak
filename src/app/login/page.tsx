"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sun, LockKeyhole, UserRound, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
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
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password, next: safeNext }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "اسم المستخدم أو كلمة المرور غير صحيحة.");
        return;
      }
      window.location.assign(result.redirectTo || safeNext);
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 via-white to-slate-50 px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <Sun size={34} />
          </div>
          <p className="text-sm font-bold text-amber-600">شمسك</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-slate-500">ادخل إلى لوحة مراقبة الطاقة الخاصة بك.</p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">اسم المستخدم</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-amber-400 focus-within:bg-white">
              <UserRound size={18} className="text-slate-400" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="w-full bg-transparent text-sm outline-none" placeholder="اسم المستخدم" dir="ltr" />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">كلمة المرور</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-amber-400 focus-within:bg-white">
              <LockKeyhole size={18} className="text-slate-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="w-full bg-transparent text-sm outline-none" placeholder="كلمة المرور" dir="ltr" />
            </div>
          </label>

          {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

          <button type="submit" disabled={loading || !username || !password} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <><Loader2 size={18} className="animate-spin" /> جارٍ تسجيل الدخول…</> : "دخول إلى شمسك"}
          </button>
        </form>
      </section>
    </main>
  );
}
