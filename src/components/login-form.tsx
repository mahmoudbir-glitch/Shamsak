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
    <form onSubmit={handleSubmit} dir="rtl" className="w-full space-y-4" noValidate={false}>
      <div className="relative">
        <User size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          name="username"
          type="text"
          placeholder="اسم المستخدم"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={loading}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-11 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />
      </div>

      <div className="relative">
        <Lock size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="كلمة المرور"
          autoComplete="current-password"
          required
          disabled={loading}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-11 text-right outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          disabled={loading}
          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
