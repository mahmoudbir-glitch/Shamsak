import type { EnergySnapshot } from "@/lib/energy";
import type { IntelligentEnergyContext, IntelligentEnergySettings } from "@/lib/intelligent-energy";

export type LoadDecision = {
  decision: "run" | "delay" | "avoid" | "unknown";
  title: string;
  reason: string;
};

/**
 * Decides whether a specific flexible load is reasonable to run now.
 * The load power must be supplied in watts; without it Shamsak must not guess.
 */
export function recommendLoadAction(
  snapshot: EnergySnapshot,
  loadPowerW: number,
  settings?: IntelligentEnergySettings,
  context?: IntelligentEnergyContext,
): LoadDecision {
  if (snapshot.stale) {
    return {
      decision: "unknown",
      title: "لا توجد بيانات كافية",
      reason: "آخر قراءة ليست حية، لذلك لا يمكن اتخاذ قرار آمن بشأن تشغيل الحمل.",
    };
  }

  if (!Number.isFinite(loadPowerW) || loadPowerW <= 0) {
    return {
      decision: "unknown",
      title: "لا توجد بيانات كافية",
      reason: "قدرة الحمل المطلوبة غير معروفة أو غير صالحة.",
    };
  }

  const solarW = Math.max(0, Number.isFinite(snapshot.solarPowerW) ? snapshot.solarPowerW : 0);
  const homeW = Math.max(0, Number.isFinite(snapshot.homePowerW) ? snapshot.homePowerW : 0);
  const batteryPowerW = Number.isFinite(snapshot.batteryPowerW) ? snapshot.batteryPowerW : 0;
  const soc = Math.min(100, Math.max(0, Number.isFinite(snapshot.batterySoc) ? snapshot.batterySoc : 0));
  const reservePct = settings
    ? Math.min(99, Math.max(0, Number.isFinite(settings.batteryMinReservePct) ? settings.batteryMinReservePct : 10))
    : 10;
  const batteryDischarging = batteryPowerW < -50;
  const batteryCharging = batteryPowerW > 50;
  const solarSurplusAfterLoad = solarW - homeW - loadPowerW;
  const batteryDropPerHour = context?.batterySocDropPerHour;
  const healthyReserve = soc > reservePct + 10;

  if (solarSurplusAfterLoad >= 200 && soc < 95) {
    return {
      decision: "run",
      title: "يمكن تشغيل الحمل الآن",
      reason: `الشمس لديها فائض يقارب ${Math.round(solarSurplusAfterLoad)} واط بعد الحمل المطلوب، دون زيادة متوقعة في سحب البطارية.`,
    };
  }

  if (batteryDischarging && soc <= reservePct + 5) {
    return {
      decision: "avoid",
      title: "لا يُنصح بتشغيل الحمل الآن",
      reason: `البطارية عند ${Math.round(soc)}% وقريبة جداً من حد الاحتياطي ${Math.round(reservePct)}% وهي تفرغ حالياً.`,
    };
  }

  if (
    batteryDischarging &&
    typeof batteryDropPerHour === "number" &&
    Number.isFinite(batteryDropPerHour) &&
    batteryDropPerHour >= 8 &&
    soc <= reservePct + 15
  ) {
    return {
      decision: "avoid",
      title: "لا يُنصح بتشغيل الحمل الآن",
      reason: `البطارية تهبط بسرعة حالياً (نحو ${Math.round(batteryDropPerHour)}% بالساعة) وقريبة من الاحتياطي.`,
    };
  }

  if (batteryDischarging && !healthyReserve) {
    return {
      decision: "delay",
      title: "يفضل تأجيل الحمل",
      reason: `تشغيل حمل ${Math.round(loadPowerW)} واط سيزيد اعتماد المنزل على البطارية بينما هي تفرغ وقريبة نسبياً من الاحتياطي.`,
    };
  }

  if (batteryCharging && solarSurplusAfterLoad >= 0) {
    return {
      decision: "run",
      title: "يمكن تشغيل الحمل الآن",
      reason: "البطارية تشحن حالياً والطاقة الشمسية تغطي الحمل الحالي والحمل المطلوب تقريباً.",
    };
  }

  if (healthyReserve && solarW >= homeW * 0.8) {
    return {
      decision: "delay",
      title: "يفضل الانتظار قليلاً",
      reason: "الحالة مستقرة، لكن تشغيل الحمل الآن قد يحتاج جزءاً من البطارية؛ الانتظار حتى يرتفع الفائض الشمسي أفضل.",
    };
  }

  return {
    decision: "delay",
    title: "يفضل تأجيل الحمل",
    reason: "لا يوجد فائض شمسي واضح يكفي للحمل حالياً، وتشغيله قد يزيد السحب من البطارية أو الشبكة.",
  };
}
