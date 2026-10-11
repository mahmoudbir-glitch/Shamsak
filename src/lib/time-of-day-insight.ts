import type { EnergySnapshot } from "@/lib/energy";

export type TimeOfDayInsight = {
  period: "night" | "morning" | "midday" | "evening";
  title: string;
  summary: string;
  recommendation: string;
};

/**
 * Conservative time-of-day guidance. It describes the current period without
 * inventing weather or future solar production.
 */
export function analyzeTimeOfDay(
  snapshot: EnergySnapshot,
  date = new Date(),
): TimeOfDayInsight {
  const hour = date.getHours();
  const solarW = Math.max(0, snapshot.solarPowerW);
  const homeW = Math.max(0, snapshot.homePowerW);
  const batteryDischarging = snapshot.batteryPowerW < -50;

  if (hour < 6) {
    return {
      period: "night",
      title: "الفترة الليلية",
      summary: "الإنتاج الشمسي يكون عادةً غير متاح في هذه الفترة، لذلك الأولوية لإدارة البطارية أو الشبكة.",
      recommendation: batteryDischarging ? "خفّف الأحمال غير الضرورية للحفاظ على البطارية حتى الصباح." : "حافظ على الأحمال الضرورية وراقب مستوى البطارية.",
    };
  }

  if (hour < 11) {
    return {
      period: "morning",
      title: "الفترة الصباحية",
      summary: solarW > 0 ? `الإنتاج الشمسي بدأ حالياً بنحو ${Math.round(solarW)} واط.` : "الفترة الصباحية بدأت، لكن لا تظهر طاقة شمسية واضحة في القراءة الحالية.",
      recommendation: solarW >= homeW + 200 ? "يوجد فائض شمسي؛ يمكن تأجيل الأحمال المرنة حتى يستقر الإنتاج أو تشغيلها الآن بحذر." : "يفضل مراقبة ارتفاع الإنتاج الشمسي قبل تشغيل الأحمال المرنة.",
    };
  }

  if (hour < 16) {
    return {
      period: "midday",
      title: "فترة الذروة الشمسية",
      summary: solarW >= homeW ? "القراءة الحالية تشير إلى تغطية شمسية جيدة للحمل." : "القراءة الحالية لا تغطي كامل استهلاك المنزل بالطاقة الشمسية.",
      recommendation: solarW >= homeW + 200 ? "هذا وقت مناسب نسبياً لتشغيل الأحمال المرنة اعتماداً على الفائض الحالي." : "استخدم الطاقة الشمسية للأحمال الأساسية وراقب البطارية قبل إضافة حمل جديد.",
    };
  }

  return {
    period: "evening",
    title: "الفترة المسائية",
    summary: solarW > 0 ? `ما زال هناك إنتاج شمسي بنحو ${Math.round(solarW)} واط، لكن فترة الإنتاج تتجه للانخفاض.` : "الإنتاج الشمسي منخفض حالياً، لذا قد تزداد أهمية البطارية أو الشبكة.",
    recommendation: batteryDischarging ? "يفضل تخفيف الأحمال المرنة للحفاظ على البطارية خلال المساء." : "راقب البطارية والشبكة قبل تشغيل أحمال كبيرة.",
  };
}
