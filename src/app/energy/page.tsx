import { SmartForecast } from "@/components/smart-forecast";
import { SurplusRecommendations } from "@/components/surplus-recommendations";

/** الطاقة: التوقعات (اليوم والليلة والتفاصيل المطوية) ثم التوصيات. الترويسة داخل SmartForecast. */
export default function EnergyPage() {
  return (
    <div className="w-full space-y-3 pb-4" dir="rtl">
      <SmartForecast />
      <SurplusRecommendations />
    </div>
  );
}
