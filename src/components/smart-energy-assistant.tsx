"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { forecastEnergy } from "@/lib/energy-forecast";
import { analyzeEnergy } from "@/lib/intelligent-energy";

const QUICK_QUESTIONS = ["هل البطارية بخير؟", "هل أستطيع تشغيل حمل الآن؟", "ماذا سيحدث بعد ساعة؟"];

export function SmartEnergyAssistant({ snapshot }: { snapshot: EnergySnapshot | null }) {
  const [question, setQuestion] = useState("");

  const insight = useMemo(() => (snapshot ? analyzeEnergy(snapshot) : null), [snapshot]);

  const answer = useMemo(() => {
    if (!snapshot || snapshot.stale) return "لا توجد بيانات حية كافية حالياً. تحقق من اتصال الإنفرتر أو الـ Gateway ثم أعد المحاولة.";

    const q = question.trim();
    if (!q) return "اسألني عن البطارية أو استهلاك المنزل أو الطاقة الشمسية أو التوقع خلال الساعة القادمة.";

    if (q.includes("بطاري") || q.includes("شحن") || q.includes("نسبة")) {
      const state = snapshot.batteryPowerW > 50 ? "تشحن" : snapshot.batteryPowerW < -50 ? "تفرغ" : "مستقرة";
      return `البطارية حالياً عند ${Math.round(snapshot.batterySoc)}٪ وهي ${state}. ${snapshot.batteryPowerW < -50 ? "إذا استمر السحب، راقب الأحمال الكبيرة." : "الوضع الحالي لا يشير إلى سحب قوي من البطارية."}`;
    }

    if (q.includes("شمس") || q.includes("شمسي") || q.includes("إنتاج")) {
      return `الإنتاج الشمسي الحالي نحو ${Math.round(snapshot.solarPowerW)} واط، بينما استهلاك المنزل نحو ${Math.round(snapshot.homePowerW)} واط. ${snapshot.solarPowerW >= snapshot.homePowerW ? "يوجد تغطية شمسية جيدة للحمل الحالي." : "الشمس لا تغطي كامل الحمل الحالي."}`;
    }

    if (q.includes("حمل") || q.includes("أشغل") || q.includes("تشغيل") || q.includes("جهاز")) {
      if (snapshot.batteryPowerW < -50 && snapshot.batterySoc <= 25) return "يفضل تأجيل الحمل غير الضروري؛ البطارية تفرغ ونسبتها منخفضة نسبياً.";
      if (snapshot.solarPowerW > snapshot.homePowerW + 200) return "هناك فائض شمسي حالياً، لذلك الوقت مناسب نسبياً لتشغيل حمل مرن، مع مراعاة قدرته.";
      return "لا يظهر فائض شمسي واضح حالياً. يفضل تأجيل الحمل المرن إذا لم يكن ضرورياً.";
    }

    if (q.includes("ساعة") || q.includes("توقع") || q.includes("لاحق")) {
      const forecast = forecastEnergy(snapshot);
      const point = forecast.points[1];
      if (!point) return "لا توجد بيانات كافية لبناء توقع للساعة القادمة.";
      return point.expectedBatterySocPct === null
        ? `بعد ساعة، يُتوقع أن يبقى استهلاك المنزل قريباً من ${point.expectedHomePowerW} واط والإنتاج الشمسي قريباً من ${point.expectedSolarPowerW} واط. لا يمكن تقدير البطارية بدقة.`
        : `بعد ساعة، يُتوقع استهلاك قريب من ${point.expectedHomePowerW} واط وإنتاج شمسي قريب من ${point.expectedSolarPowerW} واط، والبطارية نحو ${Math.round(point.expectedBatterySocPct)}٪ إذا استمر الاتجاه الحالي.`;
    }

    return "أستطيع حالياً الإجابة عن حالة البطارية، الإنتاج الشمسي، استهلاك المنزل، تشغيل حمل، أو التوقع للساعة القادمة.";
  }, [question, snapshot]);

  return (
    <section dir="rtl" className="rounded-2xl border border-sky-200 bg-sky-50 p-4" aria-label="المساعد الذكي للطاقة">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-sky-600" aria-hidden="true" />
        <h2 className="text-sm font-black text-sky-950">مساعد شمسك الذكي</h2>
      </div>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">اسأل عن حالة منظومتك، وسيجيب اعتماداً على بيانات الطاقة الحالية فقط.</p>

      {insight?.alert && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-xs font-black text-amber-900">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{insight.title}</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-amber-800">{insight.summary}</p>
          <p className="mt-1 text-[11px] font-bold text-amber-900">الإجراء المقترح: {insight.action}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_QUESTIONS.map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-sm hover:bg-slate-50">{item}</button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="اكتب سؤالك هنا..." className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-sky-400" aria-label="سؤال المساعد الذكي" />
      </div>
      <div className="mt-3 rounded-xl bg-white/80 px-3 py-3 text-xs font-bold leading-6 text-slate-700">{answer}</div>
    </section>
  );
}
