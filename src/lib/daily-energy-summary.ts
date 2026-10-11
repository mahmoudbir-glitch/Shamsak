import type { EnergySnapshot } from "@/lib/energy";

export type DailyEnergySummary = {
  title: string;
  summary: string;
  recommendation: string;
};

export function buildDailyEnergySummary(snapshot: EnergySnapshot): DailyEnergySummary | null {
  if (snapshot.source !== "live" || snapshot.stale) return null;

  const usage = typeof snapshot.todayHomeUsageKWh === "number" && Number.isFinite(snapshot.todayHomeUsageKWh)
    ? Math.max(0, snapshot.todayHomeUsageKWh)
    : null;
  const production = typeof snapshot.todayProductionKWh === "number" && Number.isFinite(snapshot.todayProductionKWh)
    ? Math.max(0, snapshot.todayProductionKWh)
    : null;
  const soc = Number.isFinite(snapshot.batterySoc) ? Math.max(0, Math.min(100, snapshot.batterySoc)) : null;

  if (usage === null && production === null && soc === null) return null;

  const solarCoverage = usage !== null && usage > 0 && production !== null
    ? Math.round(Math.min(100, (production / usage) * 100))
    : null;

  const parts: string[] = [];
  if (usage !== null) parts.push(`استهلاك اليوم ${usage.toFixed(1)} kWh`);
  if (production !== null) parts.push(`إنتاج شمسي ${production.toFixed(1)} kWh`);
  if (solarCoverage !== null) parts.push(`والشمس وفرت نحو ${solarCoverage}% من حجم الاستهلاك اليومي`);
  if (soc !== null) parts.push(`البطارية الآن عند ${Math.round(soc)}%`);

  let recommendation = "استمر في مراقبة الاستهلاك والإنتاج خلال بقية اليوم.";
  if (soc !== null && soc <= 20) {
    recommendation = "يفضل تخفيف الأحمال غير الضرورية للحفاظ على احتياطي البطارية.";
  } else if (solarCoverage !== null && solarCoverage >= 80) {
    recommendation = "كان الاعتماد على الطاقة الشمسية جيداً؛ حاول تشغيل الأحمال المرنة خلال ساعات الإنتاج.";
  } else if (solarCoverage !== null && solarCoverage < 50) {
    recommendation = "راقب الأحمال الكبيرة، لأن الإنتاج الشمسي لم يغطِّ معظم استهلاك اليوم حتى الآن.";
  }

  return {
    title: "ملخص الطاقة اليوم",
    summary: parts.join("، ") + ".",
    recommendation,
  };
}
