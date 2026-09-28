import { SmartForecast } from "@/components/smart-forecast";
import { SurplusRecommendations } from "@/components/surplus-recommendations";

export default function EnergyPage() {
  return (
    <div className="w-full space-y-3 pb-4" dir="rtl">
      <header className="rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl ring-1 ring-amber-200/70">
            ☀️
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-amber-600">شمسك • الطاقة</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              إدارة طاقتك بذكاء
            </h1>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500">
              اعرف ما الذي يحدث الآن، ماذا تتوقع الشمس، ومتى يكون أفضل وقت لاستخدام الطاقة.
            </p>
          </div>
        </div>
      </header>

      <SmartForecast />

      <SurplusRecommendations />

      <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-3 text-xs font-semibold leading-5 text-sky-900">
        <strong className="font-black">كيف تستخدم الصفحة؟</strong>{" "}
        ابدأ بالتوقعات الأساسية، ثم راجع كفاية البطارية، وبعدها استخدم نافذة الفائض لتحديد الأجهزة المناسبة للتشغيل.
      </div>
    </div>
  );
}
