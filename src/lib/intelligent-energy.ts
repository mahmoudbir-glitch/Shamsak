import type { EnergySnapshot } from "@/lib/energy";

export type IntelligentEnergySettings = {
  batteryCapacityWh: number;
  batteryMinReservePct: number;
};

export type IntelligentEnergyContext = {
  recentAverageHomePowerW?: number | null;
};

export type IntelligentInsight = {
  tone: "green" | "amber" | "red" | "blue";
  title: string;
  summary: string;
  action: string;
  recommendation?: string;
  details: string[];
  /** True when the user should pay attention; normal states stay quiet. */
  alert: boolean;
};

const safeNumber = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);

function formatDuration(minutes: number) {
  if (minutes < 1) return "أقل من دقيقة";
  if (minutes < 60) return `${minutes} دقيقة تقريباً`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 48) return "أكثر من 48 ساعة";
  return rest ? `${hours} ساعة و${rest} دقيقة تقريباً` : `${hours} ساعة تقريباً`;
}

function batteryEstimate(snapshot: EnergySnapshot, settings: IntelligentEnergySettings) {
  const soc = Math.min(100, Math.max(0, safeNumber(snapshot.batterySoc)));
  const powerW = safeNumber(snapshot.batteryPowerW);
  const capacityWh = safeNumber(settings.batteryCapacityWh);
  const reservePct = Math.min(99, Math.max(0, safeNumber(settings.batteryMinReservePct, 10)));
  if (capacityWh <= 0 || Math.abs(powerW) < 50) return null;

  const charging = powerW > 0;
  const usableWh = charging
    ? ((100 - soc) / 100) * capacityWh
    : (Math.max(0, soc - reservePct) / 100) * capacityWh;
  if (!charging && usableWh <= 0) return { charging, label: "عند حد الاحتياطي" };

  const hours = usableWh / Math.abs(powerW);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return { charging, label: formatDuration(Math.round(hours * 60)) };
}

export function analyzeEnergy(
  snapshot: EnergySnapshot,
  settings?: IntelligentEnergySettings,
  context?: IntelligentEnergyContext,
): IntelligentInsight {
  const solarKw = Math.max(0, safeNumber(snapshot.solarPowerW)) / 1000;
  const homeKw = Math.max(0, safeNumber(snapshot.homePowerW)) / 1000;
  const gridImport = Math.max(0, safeNumber(snapshot.gridPowerW)) / 1000;
  const soc = Math.min(100, Math.max(0, safeNumber(snapshot.batterySoc)));
  const batteryPowerW = safeNumber(snapshot.batteryPowerW);
  const batteryDischarging = batteryPowerW < -50;
  const batteryCharging = batteryPowerW > 50;
  const solarSurplus = Math.max(0, solarKw - homeKw);
  const reservePct = settings ? Math.min(99, Math.max(0, safeNumber(settings.batteryMinReservePct, 10))) : 10;
  const nearReserve = batteryDischarging && soc > reservePct && soc <= reservePct + 5;
  const estimate = settings ? batteryEstimate(snapshot, settings) : null;
  const estimateDetail = estimate
    ? estimate.charging
      ? `بالقدرة الحالية، قد تحتاج البطارية ${estimate.label} للوصول إلى 100٪.`
      : `بالقدرة الحالية، التقدير حتى حد الاحتياطي هو ${estimate.label}.`
    : null;
  const recentAverageW = context?.recentAverageHomePowerW;
  const unusualLoad =
    typeof recentAverageW === "number" &&
    Number.isFinite(recentAverageW) &&
    recentAverageW >= 500 &&
    snapshot.homePowerW >= recentAverageW * 1.6 &&
    snapshot.homePowerW - recentAverageW >= 800;
  const unusualLoadDetail = unusualLoad
    ? `الاستهلاك الحالي أعلى من متوسط القراءات الأخيرة بنحو ${Math.round((snapshot.homePowerW / recentAverageW - 1) * 100)}٪.`
    : null;

  if (snapshot.stale) {
    return {
      tone: "amber",
      alert: true,
      title: "القراءة تحتاج انتباه",
      summary: "آخر قراءة ليست حية؛ لا نعتمد عليها لاتخاذ قرار فوري.",
      action: "تحقق من اتصال الإنفرتر أو الـ Gateway",
      details: ["تجنب تشغيل أحمال كبيرة اعتماداً على هذه القراءة.", "عند عودة البيانات الحية سيعيد شمسك التحليل تلقائياً."],
    };
  }

  if (soc <= 10) {
    return {
      tone: "red",
      alert: true,
      title: "البطارية منخفضة جداً",
      summary: `البطارية عند ${Math.round(soc)}%${batteryDischarging ? " وتفرغ حالياً" : ""}.`,
      action: "خفّف الأحمال غير الضرورية",
      recommendation: "يفضل تأجيل الأحمال المرنة حتى تتحسن حالة البطارية.",
      details: ["الأولوية الآن للحفاظ على الطاقة للأحمال الأساسية.", gridImport > 0 ? "الشبكة تساهم حالياً في تغذية المنزل." : "لا يظهر سحب من الشبكة في القراءة الحالية.", ...(unusualLoadDetail ? [unusualLoadDetail] : []), ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (batteryDischarging && soc <= 20 && homeKw >= 2) {
    return {
      tone: "red",
      alert: true,
      title: "استهلاك مرتفع مع بطارية منخفضة",
      summary: `المنزل يسحب ${homeKw.toFixed(1)} kW والبطارية عند ${Math.round(soc)}%.`,
      action: "راجع الأحمال الكبيرة الآن",
      recommendation: "يفضل تأجيل الأحمال المرنة لتقليل سرعة هبوط البطارية.",
      details: ["تشغيل سخان أو مكيف أو حمل كبير قد يسرّع هبوط البطارية.", "إذا كان هناك حمل غير ضروري، إيقافه قد يطيل وقت التشغيل.", ...(unusualLoadDetail ? [unusualLoadDetail] : []), ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (nearReserve) {
    return {
      tone: "amber",
      alert: true,
      title: "البطارية تقترب من الاحتياطي",
      summary: `البطارية عند ${Math.round(soc)}% وتفرغ حالياً، والاحتياطي مضبوط على ${Math.round(reservePct)}%.`,
      action: "خفّف أو أجّل الأحمال المرنة",
      recommendation: "يفضل الحفاظ على الطاقة للأحمال الأساسية حتى تتوقف البطارية عن الهبوط أو يبدأ الشحن.",
      details: ["شمسك يعتمد هنا على حد الاحتياطي المحفوظ في إعدادات البطارية.", ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (unusualLoad) {
    return {
      tone: "amber",
      alert: true,
      title: "الاستهلاك أعلى من المعتاد",
      summary: `الاستهلاك الحالي ${homeKw.toFixed(1)} kW أعلى بوضوح من متوسطك الأخير.`,
      action: "تحقق من الأجهزة التي تعمل الآن",
      recommendation: "إذا لم يكن الحمل ضرورياً، خفّفه مؤقتاً حتى يعود الاستهلاك لمعدله المعتاد.",
      details: [unusualLoadDetail!, "قد يكون السبب جهازاً كبيراً بدأ العمل أو عدة أحمال تعمل معاً.", ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (homeKw >= 5 && solarKw < homeKw * 0.5) {
    return {
      tone: "amber",
      alert: true,
      title: "الحمل مرتفع حالياً",
      summary: `استهلاك المنزل ${homeKw.toFixed(1)} kW بينما الشمس تغطي جزءاً محدوداً منه.`,
      action: "خفّف الأحمال الكبيرة إن لم تكن ضرورية",
      recommendation: "يفضل تأجيل أي حمل مرن حتى ينخفض الاستهلاك أو يرتفع الإنتاج الشمسي.",
      details: ["الفارق بين الاستهلاك والإنتاج قد يزيد السحب من البطارية أو الشبكة.", "راقب البطارية إذا استمر هذا الحمل.", ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (solarSurplus >= 0.8 && soc < 90) {
    return {
      tone: "green",
      alert: false,
      title: "وقت جيد لاستخدام الطاقة الشمسية",
      summary: `يوجد فائض شمسي يقارب ${solarSurplus.toFixed(1)} kW والبطارية ليست ممتلئة.`,
      action: "يمكنك تشغيل حمل إضافي باعتدال",
      recommendation: "الآن وقت مناسب لتشغيل حمل مرن، ما دام الفائض الشمسي مستمراً.",
      details: ["الفائض الحالي أعلى من استهلاك المنزل.", "يفضل الاستفادة من الأحمال المرنة أثناء وجود الشمس.", ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (batteryCharging && solarKw > homeKw && soc < 95) {
    return {
      tone: "green",
      alert: false,
      title: "المنظومة تعمل بكفاءة جيدة",
      summary: `الشمس تغطي الاستهلاك والبطارية تشحن عند ${Math.round(soc)}%.`,
      action: "لا يوجد إجراء مطلوب",
      recommendation: "يمكنك الاستفادة من الطاقة الشمسية للأحمال المرنة دون الحاجة لتدخل الآن.",
      details: ["الإنتاج الشمسي أعلى من حمل المنزل حالياً.", "جزء من الطاقة يذهب لشحن البطارية.", ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (gridImport >= 1 && solarKw < 0.5) {
    return {
      tone: "blue",
      alert: false,
      title: "المنزل يعتمد على الشبكة الآن",
      summary: `السحب من الشبكة يقارب ${gridImport.toFixed(1)} kW.`,
      action: "راقب عودة الإنتاج الشمسي",
      recommendation: "يفضل تأجيل الأحمال المرنة إذا لم تكن ضرورية حتى تتحسن الطاقة الشمسية.",
      details: ["الإنتاج الشمسي منخفض في هذه اللحظة.", "لا يعني ذلك وجود عطل بحد ذاته؛ يعتمد التفسير على وقت اليوم وحالة الإنفرتر.", ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  return {
    tone: "green",
    alert: false,
    title: "الوضع طبيعي",
    summary: `الاستهلاك ${homeKw.toFixed(1)} kW والبطارية ${Math.round(soc)}%.`,
    action: "استمر بالمراقبة",
    details: ["لا توجد إشارة واضحة لحالة حرجة في القراءة الحالية.", ...(estimateDetail ? [estimateDetail] : []), "سيغيّر شمسك هذه البطاقة تلقائياً إذا تغيرت حالة المنظومة."],
  };
}
