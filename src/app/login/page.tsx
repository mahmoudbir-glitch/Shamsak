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
        credentials: "same-origin",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "بيانات تسجيل الدخول غير صحيحة.");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-[calc(100vh-2rem)] items-center justify-center bg-slate-50 px-4 py-8"
    >
      <div className="w-full max-w-md">
        <p className="mb-5 text-center text-lg font-semibold text-slate-600">
          مراقبة أنظمة الطاقة الشمسية
        </p>

        <section
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.08)] sm:p-8"
          aria-labelledby="login-title"
        >
          <div className="mb-7 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500"
              aria-hidden="true"
            >
              <Sun size={27} />
            </div>
            <div>
              <h1 id="login-title" className="text-2xl font-black text-slate-900">
                تسجيل الدخول
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                ادخل ببيانات حسابك على WatchPower
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">اسم المستخدم</span>
              <input
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                dir="ltr"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">كلمة المرور</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                dir="ltr"
              />
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
              >
                {error}
              </div>
            )}

            <div className="flex justify-start">
              <button
                type="submit"
                disabled={loading}
                className="flex min-w-28 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-bold text-white transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <LockKeyhole size={18} aria-hidden="true" />
                ) : (
                  <LogIn size={18} aria-hidden="true" />
                )}
                {loading ? "جارٍ الدخول…" : "دخول"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
