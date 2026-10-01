"use client";

import { SmartForecast } from "@/components/smart-forecast";
import { SmartEnergyProvider } from "@/components/smart-energy-provider";

export default function ForecastPage() {
  return <div className="w-full"><SmartEnergyProvider><SmartForecast /></SmartEnergyProvider></div>;
}
