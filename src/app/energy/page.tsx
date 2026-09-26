"use client";

import { SmartForecast } from "@/components/smart-forecast";
import { SurplusRecommendations } from "@/components/surplus-recommendations";

export default function EnergyPage() {
  return (
    <div className="w-full space-y-5" dir="rtl">
      <SmartForecast />
      <SurplusRecommendations />
    </div>
  );
}
