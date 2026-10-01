"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const nextParam = searchParams.get("next");
    const next =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/";

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ username, password, next }),
      });

      let data: { error?: string; redirectTo?: string } = {};
      try {
        data = (await response.json()) as { error?: string; redirectTo?: string };
      } catch {
        data = {};
      }

      if (!response.ok) {
        const messages: Record<string, string> = {
          missing_credentials: "أدخل اسم المستخدم وكلمة المرور.",
          invalid_username: "اسم المستخدم غير موجود.",
          invalid_password: "كلمة المرور غير صحيحة.",
          invalid_credentials: "اسم المستخدم أو كلمة المرور غير صحيحة.",
          auth_not_configured: "إعدادات تسجيل الدخول غير مكتملة على الخادم. تأكد من SHAMSAK_USER و SHAMSAK_PASSWORD في Vercel.",
          too_many_attempts: "تم تجاوز عدد محاولات الدخول. حاول بعد 10 دقائق.",
          session_creation_failed: "تم التحقق من البيانات لكن تعذر إنشاء الجلسة. تحقق من إعداد AUTH_SECRET في Vercel.",
          invalid_json: "تعذر قراءة طلب تسجيل الدخول.",
        };
        setError(messages[data.error ?? ""] ?? `فشل تسجيل الدخول (HTTP ${response.status}).`);
        return;
      }

      const redirectTo = data.redirectTo || next;
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("تعذر الوصول إلى خادم تسجيل الدخول. تحقق من اتصال الإنترنت ثم حاول مجددًا.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} dir="rtl" className="w-full space-y-3" noValidate={false}>
      <div className="relative">
        <User size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          name="username"
          type="text"
          placeholder="اسم مستخدم شمسك"
          aria-label="اسم مستخدم شمسك"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={loading}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-right text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100 disabled:opacity-60"
        />
      </div>

      <div className="relative">
        <Lock size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="كلمة المرور"
          aria-label="كلمة المرور"
          autoComplete="current-password"
          required
          disabled={loading}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-right text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          disabled={loading}
          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="!mt-5 h-12 w-full rounded-2xl bg-gradient-to-l from-amber-500 to-orange-500 text-sm font-black text-white shadow-[0_10px_24px_rgba(245,158,11,0.32)] transition hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
