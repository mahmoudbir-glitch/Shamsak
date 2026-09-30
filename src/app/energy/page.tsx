import { Sun } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SmartForecast } from "@/components/smart-forecast";
import { SurplusRecommendations } from "@/components/surplus-recommendations";

export default function EnergyPage() {
  return (
    <div className="w-full space-y-3 pb-4" dir="rtl">
      <PageHeader icon={Sun} tone="amber" eyebrow="شمسك • الطاقة" title="إدارة طاقتك بذكاء" subtitle="ماذا تتوقع الشمس، ومتى يكون أفضل وقت لاستخدام الطاقة." />

      <SmartForecast />

      <SurplusRecommendations />

      <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-3 text-xs font-semibold leading-5 text-sky-900">
        <strong className="font-black">كيف تستخدم الصفحة؟</strong>{" "}
        ابدأ بالتوقعات الأساسية، ثم راجع كفاية البطارية، وبعدها استخدم نافذة الفائض لتحديد الأجهزة المناسبة للتشغيل.
      </div>
    </div>
  );
}
