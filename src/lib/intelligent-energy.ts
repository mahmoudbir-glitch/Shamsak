import type { EnergySnapshot } from "@/lib/energy";

export type IntelligentInsight = {
  tone: "green" | "amber" | "red" | "blue";
  title: string;
  summary: string;
  action: string;
  details: string[];
};

export function analyzeEnergy(snapshot: EnergySnapshot): IntelligentInsight {
  const solarKw = Math.max(0, snapshot.solarPowerW) / 1000;
  const homeKw = Math.max(0, snapshot.homePowerW) / 1000;
  const soc = snapshot.batterySoc;
  const batteryDischarging = snapshot.batteryPowerW < -50;
  const batteryCharging = snapshot.batteryPowerW > 50;
  const gridImport = Math.max(0, snapshot.gridPowerW) / 1000;
  const solarSurplus = Math.max(0, solarKw - homeKw);

  if (snapshot.stale) {
    return {
      tone: "amber",
      title: "القراءة تحتاج انتباه",
      summary: "آخر قراءة ليست حية؛ لا نعتمد عليها لاتخاذ قرار فوري.",
      action: "تحقق من اتصال الإنفرتر أو الـ Gateway",
      details: ["تجنب تشغيل أحمال كبيرة اعتماداً على هذه القراءة.", "عند عودة البيانات الحية سيعيد شمسك التحليل تلقائياً."],
    };
  }

  if (soc <= 10) {
    return {
      tone: "red",
      title: "البطارية منخفضة جداً",
      summary: `البطارية عند ${Math.round(soc)}%${batteryDischarging ? " وتفرغ حالياً" : ""}.`,
      action: "خفّف الأحمال غير الضرورية",
      details: ["الأولوية الآن للحفاظ على الطاقة للأحمال الأساسية.", gridImport > 0 ? "الشبكة تساهم حالياً في تغذية المنزل." : "لا يظهر سحب من الشبكة في القراءة الحالية."],
    };
  }

  if (batteryDischarging && soc <= 20 && homeKw >= 2) {
    return {
      tone: "red",
      title: "استهلاك مرتفع مع بطارية منخفضة",
      summary: `المنزل يسحب ${homeKw.toFixed(1)} kW والبطارية عند ${Math.round(soc)}%.`,
      action: "راجع الأحمال الكبيرة الآن",
      details: ["تشغيل سخان أو مكيف أو حمل كبير قد يسرّع هبوط البطارية.", "إذا كان هناك حمل غير ضروري، إيقافه قد يطيل وقت التشغيل."],
    };
  }

  if (solarSurplus >= 0.8 && soc < 90) {
    return {
      tone: "green",
      title: "وقت جيد لاستخدام الطاقة الشمسية",
      summary: `يوجد فائض شمسي يقارب ${solarSurplus.toFixed(1)} kW والبطارية ليست ممتلئة.`,
      action: "يمكنك تشغيل حمل إضافي باعتدال",
      details: ["الفائض الحالي أعلى من استهلاك المنزل.", "يفضل الاستفادة من الأحمال المرنة أثناء وجود الشمس."],
    };
  }

  if (batteryCharging && solarKw > homeKw && soc < 95) {
    return {
      tone: "green",
      title: "المنظومة تعمل بكفاءة جيدة",
      summary: `الشمس تغطي الاستهلاك والبطارية تشحن عند ${Math.round(soc)}%.`,
      action: "لا يوجد إجراء مطلوب",
      details: ["الإنتاج الشمسي أعلى من حمل المنزل حالياً.", "جزء من الطاقة يذهب لشحن البطارية."],
    };
  }

  if (gridImport >= 1 && solarKw < 0.5) {
    return {
      tone: "blue",
      title: "المنزل يعتمد على الشبكة الآن",
      summary: `السحب من الشبكة يقارب ${gridImport.toFixed(1)} kW.`,
      action: "راقب عودة الإنتاج الشمسي",
      details: ["الإنتاج الشمسي منخفض في هذه اللحظة.", "لا يعني ذلك وجود عطل بحد ذاته؛ يعتمد التفسير على وقت اليوم وحالة الإنفرتر."],
    };
  }

  return {
    tone: "green",
    title: "الوضع طبيعي",
    summary: `الاستهلاك ${homeKw.toFixed(1)} kW والبطارية ${Math.round(soc)}%.`,
    action: "استمر بالمراقبة",
    details: ["لا توجد إشارة واضحة لحالة حرجة في القراءة الحالية.", "سيغيّر شمسك هذه البطاقة تلقائياً إذا تغيرت حالة المنظومة."],
  };
}
