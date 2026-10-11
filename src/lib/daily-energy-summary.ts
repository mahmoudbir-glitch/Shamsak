import type { EnergySnapshot } from "@/lib/energy";

export type DailyEnergySummary = { title: string; summary: string; recommendation: string };

export function buildDailyEnergySummary(snapshot: EnergySnapshot): DailyEnergySummary | null {
  if (snapshot.source !== "live" || snapshot.stale) return null;

  const usage = typeof snapshot.todayHomeUsageKWh === "number" && Number.isFinite(snapshot.todayHomeUsageKWh) ? Math.max(0, snapshot.todayHomeUsageKWh) : null;
  const production = typeof snapshot.todayProductionKWh === "number" && Number.isFinite(snapshot.todayProductionKWh) ? Math.max(0, snapshot.todayProductionKWh) : null;
  const soc = Number.isFinite(snapshot.batterySoc) ? Math.max(0, Math.min(100, snapshot.batterySoc)) : null;
  if (usage === null && production === null && soc === null) return null;

  const parts: string[] = [];
  if (usage !== null) parts.push(`استهلاك ${usage.toFixed(1)} kWh`);
  if (production !== null) parts.push(`شمس ${production.toFixed(1)} kWh`);
  if (soc !== null) parts.push(`بطارية ${Math.round(soc)}%`);

  let recommendation = "الوضع طبيعي.";
  if (soc !== null && soc <= 20) recommendation = "خفف الأحمال غير الضرورية.";
  else if (typeof snapshot.homePowerW === "number" && snapshot.homePowerW >= 0 && snapshot.solarPowerW < snapshot.homePowerW * 0.5) recommendation = "راقب الأحمال الكبيرة.";

  return { title: "ملخص الطاقة اليوم", summary: parts.join(" · "), recommendation };
}
