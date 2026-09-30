import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "تسجيل الدخول | شمسك",
  robots: { index: false, follow: false },
};

function LoginFormFallback() {
  return (
    <div className="w-full space-y-4" aria-hidden="true">
      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div dir="rtl" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.18),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-200/25 blur-3xl" />
      <section className="relative w-full max-w-sm rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="text-5xl leading-none" aria-hidden="true">☀️</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">شمسك</h1>
          <p className="mt-0 text-sm font-extrabold text-slate-900">الشمس تعمل من أجلك</p>
          <p className="mt-3 text-sm font-extrabold text-slate-900">مراقبة أنظمة الطاقة الشمسية</p>
        </div>
        <Suspense fallback={<LoginFormFallback />}><LoginForm /></Suspense>
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          نظام إدارة الطاقة الخاص بك
        </div>
      </section>
    </div>
  );
}
