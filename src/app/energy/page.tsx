import { SmartForecast } from "@/components/smart-forecast";
import { SurplusRecommendations } from "@/components/surplus-recommendations";

export default function EnergyPage() {
  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-xl ring-1 ring-amber-200/70">☀️</div>
          <div>
            <p className="text-xs font-black text-amber-600">شمسك • الطاقة</p>
            <h1 className="mt-0.5 text-xl font-black text-slate-950">إدارة طاقتك بذكاء</h1>
          </div>
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
          توقع الإنتاج، راقب البطارية، واكتشف أفضل أوقات استخدام الفائض.
        </p>
      </div>

      <SmartForecast />
      <SurplusRecommendations />
    </div>
  );
}
