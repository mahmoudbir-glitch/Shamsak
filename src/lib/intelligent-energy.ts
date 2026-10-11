import type { EnergySnapshot } from "@/lib/energy";

export type IntelligentEnergySettings = {
  batteryCapacityWh: number;
  batteryMinReservePct: number;
};

export type IntelligentEnergyContext = {
  recentAverageHomePowerW?: number | null;
  batterySocDropPerHour?: number | null;
  recentAverageSolarPowerW?: number | null;
};

export type IntelligentInsight = {
  tone: "green" | "amber" | "red" | "blue";
  title: string;
  summary: string;
  action: string;
  recommendation?: string;
  details: string[];
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
  const batteryDropPerHour = context?.batterySocDropPerHour;
  const recentAverageSolarW = context?.recentAverageSolarPowerW;
  const rapidBatteryDrop =
    batteryDischarging &&
    typeof batteryDropPerHour === "number" &&
    Number.isFinite(batteryDropPerHour) &&
    batteryDropPerHour >= 8;
  const solarDrop =
    typeof recentAverageSolarW === "number" &&
    Number.isFinite(recentAverageSolarW) &&
    recentAverageSolarW >= 800 &&
    snapshot.solarPowerW <= recentAverageSolarW * 0.55 &&
    recentAverageSolarW - snapshot.solarPowerW >= 400;
  const solarDropDetail = solarDrop
    ? `الإنتاج الشمسي الحالي أقل من متوسط القراءات الأخيرة بنحو ${Math.round((1 - snapshot.solarPowerW / recentAverageSolarW) * 100)}٪.`
    : null;
  const unusualLoad =
    typeof recentAverageW === "number" &&
    Number.isFinite(recentAverageW) &&
    recentAverageW >= 500 &&
    snapshot.homePowerW >= recentAverageW * 1.6 &&
    snapshot.homePowerW - recentAverageW >= 800;
  const unusualLoadDetail = unusualLoad
    ? `الاستهلاك الحالي أعلى من متوسط القراءات الأخيرة بنحو ${Math.round((snapshot.homePowerW / recentAverageW - 1) * 100)}٪.`
    : null;
  const combinedEnergyStress =
    batteryDischarging &&
    soc > 10 &&
    soc <= 35 &&
    homeKw >= 1.5 &&
    solarKw < homeKw * 0.6 &&
    (solarDrop || unusualLoad || rapidBatteryDrop || homeKw >= 2.5);
  const largeLoad =
    homeKw >= 4 &&
    (unusualLoad || homeKw >= 5 || batteryDischarging || solarKw < homeKw * 0.5);

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
      details: ["الأولوية الآن للحفاظ على الطاقة للأحمال الأساسية.", gridImport > 0 ? "الشبكة تساهم حالياً في تغذية المنزل." : "لا يظهر سحب من الشبكة في القراءة الحالية.", ...(unusualLoadDetail ? [unusualLoadDetail] : []), ...(solarDropDetail ? [solarDropDetail] : []), ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (combinedEnergyStress) {
    const solarCoverage = Math.max(0, Math.min(100, Math.round((solarKw / homeKw) * 100)));
    return {
      tone: soc <= 20 || rapidBatteryDrop ? "red" : "amber",
      alert: true,
      title: "البطارية تحت ضغط",
      summary: `الشمس تغطي نحو ${solarCoverage}% من استهلاك المنزل والبطارية عند ${Math.round(soc)}% وتفرغ حالياً.`,
      action: "خفّف الأحمال غير الضرورية الآن",
      recommendation: rapidBatteryDrop
        ? "استمرار الوضع قد يقرّب البطارية من الاحتياطي بسرعة."
        : "يفضل تأجيل الأحمال المرنة حتى يتحسن الإنتاج أو ينخفض الاستهلاك.",
      details: [
        `الإنتاج الشمسي ${solarKw.toFixed(1)} kW مقابل استهلاك ${homeKw.toFixed(1)} kW.`,
        ...(solarDropDetail ? [solarDropDetail] : []),
        ...(unusualLoadDetail ? [unusualLoadDetail] : []),
        ...(rapidBatteryDrop ? [`معدل هبوط البطارية الأخير يقارب ${Math.round(batteryDropPerHour!)}% بالساعة.`] : []),
        ...(estimateDetail ? [estimateDetail] : []),
      ],
    };
  }

  if (largeLoad) {
    return {
      tone: batteryDischarging ? "red" : "amber",
      alert: true,
      title: "حمل كبير يعمل الآن",
      summary: `استهلاك المنزل وصل إلى ${homeKw.toFixed(1)} kW، وهو حمل كبير على المنظومة حالياً.`,
      action: "تحقق من الأجهزة الكبيرة التي تعمل الآن",
      recommendation: batteryDischarging
        ? "إذا لم يكن الحمل ضرورياً، خفّفه لتقليل سرعة هبوط البطارية."
        : "إذا كان الحمل غير ضروري، يفضل تشغيله عندما تكون الطاقة الشمسية أعلى.",
      details: [
        `الاستهلاك الحالي ${homeKw.toFixed(1)} kW مقابل إنتاج شمسي ${solarKw.toFixed(1)} kW.`,
        ...(unusualLoadDetail ? [unusualLoadDetail] : []),
        ...(batteryDischarging ? ["البطارية تساهم حالياً في تغذية هذا الحمل."] : []),
        ...(solarKw < homeKw ? ["الإنتاج الشمسي لا يغطي كامل الحمل الحالي."] : []),
        ...(estimateDetail ? [estimateDetail] : []),
      ],
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
      details: ["تشغيل سخان أو مكيف أو حمل كبير قد يسرّع هبوط البطارية.", "إذا كان هناك حمل غير ضروري، إيقافه قد يطيل وقت التشغيل.", ...(unusualLoadDetail ? [unusualLoadDetail] : []), ...(solarDropDetail ? [solarDropDetail] : []), ...(estimateDetail ? [estimateDetail] : [])],
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
      details: ["شمسك يعتمد هنا على حد الاحتياطي المحفوظ في إعدادات البطارية.", ...(solarDropDetail ? [solarDropDetail] : []), ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (rapidBatteryDrop) {
    return {
      tone: "amber",
      alert: true,
      title: "البطارية تهبط بسرعة",
      summary: `معدل هبوط البطارية الأخير يقارب ${Math.round(batteryDropPerHour!)}% بالساعة.`,
      action: "خفّف الأحمال غير الضرورية",
      recommendation: "إذا استمر هذا المعدل، أجّل الأحمال المرنة وراقب سبب ارتفاع الاستهلاك.",
      details: ["شمسك يقارن قراءات البطارية الحية الأخيرة، وليس قراءة واحدة فقط.", ...(unusualLoadDetail ? [unusualLoadDetail] : []), ...(solarDropDetail ? [solarDropDetail] : []), ...(estimateDetail ? [estimateDetail] : [])],
    };
  }

  if (solarDrop) {
    return {
      tone: "amber",
      alert: true,
      title: "الإنتاج الشمسي منخفض",
      summary: `الإنتاج الحالي ${solarKw.toFixed(1)} kW أقل بوضوح من متوسط الإنتاج الشمسي الأخير.`,
      action: "راقب الألواح والإنفرتر",
      recommendation: "إذا كانت السماء صافية، تحقق من وجود ظل أو اتساخ أو مشكلة في اتصال الإنفرتر.",
      details: ["شمسك يقارن الإنتاج الحالي بعدة قراءات حية سابقة، وليس قراءة واحدة.", solarDropDetail!, ...(homeKw > solarKw ? ["الاستهلاك الحالي أعلى من الإنتاج الشمسي، لذلك قد تعتمد المنظومة أكثر على البطارية أو الشبكة."] : [])],
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
      details: [unusualLoadDetail!, "قد يكون السبب جهازاً كبيراً بدأ العمل أو عدة أحمال تعمل معاً.", ...(solarDropDetail ? [solarDropDetail] : []), ...(estimateDetail ? [estimateDetail] : [])],
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
      details: ["الفارق بين الاستهلاك والإنتاج قد يزيد السحب من البطارية أو الشبكة.", "راقب البطارية إذا استمر هذا الحمل.", ...(solarDropDetail ? [solarDropDetail] : []), ...(estimateDetail ? [estimateDetail] : [])],
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
