import type { EnergySnapshot } from "@/lib/energy";

export type DailyEnergySummary = {
  title: string;
  summary: string;
  recommendation: string;
};

const recentHomePowerW: number[] = [];
const MAX_RECENT_SAMPLES = 12;

export function buildDailyEnergySummary(
  snapshot: EnergySnapshot,
  recentAverageHomePowerW?: number | null,
): DailyEnergySummary | null {
  if (snapshot.source !== "live" || snapshot.stale) return null;

  const usage = typeof snapshot.todayHomeUsageKWh === "number" && Number.isFinite(snapshot.todayHomeUsageKWh)
    ? Math.max(0, snapshot.todayHomeUsageKWh)
    : null;
  const production = typeof snapshot.todayProductionKWh === "number" && Number.isFinite(snapshot.todayProductionKWh)
    ? Math.max(0, snapshot.todayProductionKWh)
    : null;
  const soc = Number.isFinite(snapshot.batterySoc) ? Math.max(0, Math.min(100, snapshot.batterySoc)) : null;

  if (usage === null && production === null && soc === null) return null;

  const current = Math.max(0, snapshot.homePowerW);
  if (Number.isFinite(current)) {
    const previous = recentHomePowerW[recentHomePowerW.length - 1];
    if (previous === undefined || Math.abs(previous - current) >= 25) {
      recentHomePowerW.push(current);
      if (recentHomePowerW.length > MAX_RECENT_SAMPLES) recentHomePowerW.shift();
    }
  }

  const measuredAverage = recentHomePowerW.length >= 4
    ? recentHomePowerW.reduce((sum, value) => sum + value, 0) / recentHomePowerW.length
    : null;
  const suppliedAverage = typeof recentAverageHomePowerW === "number" && Number.isFinite(recentAverageHomePowerW) && recentAverageHomePowerW >= 100
    ? recentAverageHomePowerW
    : null;
  const average = suppliedAverage ?? measuredAverage;
  const differencePct = average !== null && average >= 100
    ? Math.round(((current - average) / average) * 100)
    : null;

  const solarCoverage = usage !== null && usage > 0 && production !== null
    ? Math.round(Math.min(100, (production / usage) * 100))
    : null;

  const parts: string[] = [];
  if (usage !== null) parts.push(`استهلاك اليوم ${usage.toFixed(1)} kWh`);
  if (production !== null) parts.push(`إنتاج شمسي ${production.toFixed(1)} kWh`);
  if (solarCoverage !== null) parts.push(`والشمس وفرت نحو ${solarCoverage}% من حجم الاستهلاك اليومي`);
  if (soc !== null) parts.push(`البطارية الآن عند ${Math.round(soc)}%`);
  if (differencePct !== null && Math.abs(differencePct) >= 10) {
    parts.push(differencePct > 0
      ? `الاستهلاك الحالي أعلى من متوسط القراءات الأخيرة بنحو ${differencePct}%`
      : `الاستهلاك الحالي أقل من متوسط القراءات الأخيرة بنحو ${Math.abs(differencePct)}%`);
  }

  let recommendation = "استمر في مراقبة الاستهلاك والإنتاج خلال بقية اليوم.";
  if (soc !== null && soc <= 20) {
    recommendation = "يفضل تخفيف الأحمال غير الضرورية للحفاظ على احتياطي البطارية.";
  } else if (solarCoverage !== null && solarCoverage >= 80) {
    recommendation = "كان الاعتماد على الطاقة الشمسية جيداً؛ حاول تشغيل الأحمال المرنة خلال ساعات الإنتاج.";
  } else if (solarCoverage !== null && solarCoverage < 50) {
    recommendation = "راقب الأحمال الكبيرة، لأن الإنتاج الشمسي لم يغطِّ معظم استهلاك اليوم حتى الآن.";
  } else if (differencePct !== null && differencePct >= 10) {
    recommendation = "يوجد ارتفاع ملحوظ في الحمل الحالي؛ راقب الأحمال الكبيرة أو المؤقتة.";
  }

  return {
    title: "ملخص الطاقة اليوم",
    summary: parts.join("، ") + ".",
    recommendation,
  };
}
