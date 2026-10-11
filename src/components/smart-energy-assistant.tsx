"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { forecastEnergy } from "@/lib/energy-forecast";
import { analyzeEnergy } from "@/lib/intelligent-energy";
import { recommendLoadAction } from "@/lib/load-decision";
import { analyzeTimeOfDay } from "@/lib/time-of-day-insight";
import { buildSmartAlert } from "@/lib/smart-alerts";

const QUICK_QUESTIONS = ["هل البطارية بخير؟", "هل أستطيع تشغيل حمل 1000 واط الآن؟", "ماذا سيحدث بعد ساعة؟"];
const DISMISSED_ALERT_KEY = "shamsak_dismissed_smart_alert_v1";

const DEFAULT_LOAD_SETTINGS = {
  batteryCapacityWh: 4800,
  batteryMinReservePct: 10,
};

type SmartEnergyAssistantProps = {
  snapshot: EnergySnapshot | null;
  embedded?: boolean;
};

export function SmartEnergyAssistant({ snapshot, embedded = false }: SmartEnergyAssistantProps) {
  const [question, setQuestion] = useState("");
  const [dismissedAlertKey, setDismissedAlertKey] = useState<string | null>(null);

  const insight = useMemo(() => (snapshot ? analyzeEnergy(snapshot) : null), [snapshot]);
  const smartAlert = useMemo(() => (snapshot && insight ? buildSmartAlert(snapshot, insight) : null), [snapshot, insight]);
  const timeOfDay = useMemo(
    () => (snapshot && !snapshot.stale ? analyzeTimeOfDay(snapshot) : null),
    [snapshot],
  );

  useEffect(() => {
    try {
      setDismissedAlertKey(localStorage.getItem(DISMISSED_ALERT_KEY));
    } catch {
      setDismissedAlertKey(null);
    }
  }, [smartAlert?.key]);

  const visibleAlert = smartAlert && smartAlert.key !== dismissedAlertKey ? smartAlert : null;

  const answer = useMemo(() => {
    if (!snapshot || snapshot.stale) return "لا توجد بيانات حية كافية حالياً. تحقق من اتصال الإنفرتر أو الـ Gateway ثم أعد المحاولة.";

    const q = question.trim();
    if (!q) return "اختر سؤالاً سريعاً من الخيارات أعلاه لمعرفة حالة البطارية أو الحمل أو التوقع للساعة القادمة.";

    if (q.includes("بطاري") || q.includes("شحن") || q.includes("نسبة")) {
      const state = snapshot.batteryPowerW > 50 ? "تشحن" : snapshot.batteryPowerW < -50 ? "تفرغ" : "مستقرة";
      return `البطارية حالياً عند ${Math.round(snapshot.batterySoc)}٪ وهي ${state}. ${snapshot.batteryPowerW < -50 ? "إذا استمر السحب، راقب الأحمال الكبيرة." : "الوضع الحالي لا يشير إلى سحب قوي من البطارية."}`;
    }

    if (q.includes("شمس") || q.includes("شمسي") || q.includes("إنتاج")) {
      return `الإنتاج الشمسي الحالي نحو ${Math.round(snapshot.solarPowerW)} واط، بينما استهلاك المنزل نحو ${Math.round(snapshot.homePowerW)} واط. ${snapshot.solarPowerW >= snapshot.homePowerW ? "يوجد تغطية شمسية جيدة للحمل الحالي." : "الشمس لا تغطي كامل الحمل الحالي."}`;
    }

    if (q.includes("1000") || q.includes("حمل") || q.includes("أشغل") || q.includes("تشغيل") || q.includes("جهاز")) {
      const decision = recommendLoadAction(snapshot, 1000, DEFAULT_LOAD_SETTINGS);
      return `${decision.title}: ${decision.reason}`;
    }

    if (q.includes("ساعة") || q.includes("توقع") || q.includes("لاحق")) {
      const forecast = forecastEnergy(snapshot);
      const point = forecast.points[1];
      if (!point) return "لا توجد بيانات كافية لبناء توقع للساعة القادمة.";
      return point.expectedBatterySocPct === null
        ? `بعد ساعة، يُتوقع أن يبقى استهلاك المنزل قريباً من ${point.expectedHomePowerW} واط والإنتاج الشمسي قريباً من ${point.expectedSolarPowerW} واط. لا يمكن تقدير البطارية بدقة.`
        : `بعد ساعة، يُتوقع استهلاك قريب من ${point.expectedHomePowerW} واط وإنتاج شمسي قريب من ${point.expectedSolarPowerW} واط، والبطارية نحو ${Math.round(point.expectedBatterySocPct)}٪ إذا استمر الاتجاه الحالي.`;
    }

    return "اختر أحد الأسئلة السريعة لمعرفة حالة البطارية، الإنتاج الشمسي، تشغيل حمل، أو التوقع للساعة القادمة.";
  }, [question, snapshot]);

  const dismissAlert = () => {
    if (!smartAlert) return;
    setDismissedAlertKey(smartAlert.key);
    try {
      localStorage.setItem(DISMISSED_ALERT_KEY, smartAlert.key);
    } catch {
      // التنبيه يبقى قابلاً للاستخدام حتى إذا تعذر التخزين المحلي.
    }
  };

  return (
    <section
      dir="rtl"
      className={embedded ? "" : "rounded-2xl border border-sky-200 bg-sky-50 p-4"}
      aria-label="المساعد الذكي للطاقة"
    >
      {!embedded && (
        <>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-sky-600" aria-hidden="true" />
            <h2 className="text-sm font-black text-sky-950">مساعد شمسك الذكي</h2>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">اسأل عن حالة منظومتك، وسيجيب اعتماداً على بيانات الطاقة الحالية فقط.</p>
        </>
      )}

      {timeOfDay && (
        <div className="mt-1 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5" aria-label="تحليل الفترة الحالية">
          <div className="flex items-center gap-2">
            {embedded && <Sparkles size={15} className="text-violet-600" aria-hidden="true" />}
            <div className="text-xs font-black text-sky-900">{timeOfDay.title}</div>
          </div>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">{timeOfDay.summary}</p>
          <p className="mt-1 text-[11px] font-bold leading-5 text-sky-900">نصيحة: {timeOfDay.recommendation}</p>
        </div>
      )}

      {visibleAlert && (
        <div
          className={`mt-2.5 rounded-xl px-3 py-2.5 ${visibleAlert.severity === "critical" ? "border border-rose-200 bg-rose-50" : visibleAlert.severity === "warning" ? "border border-amber-200 bg-amber-50" : "border border-sky-200 bg-sky-50"}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className={visibleAlert.severity === "critical" ? "text-rose-600" : visibleAlert.severity === "warning" ? "text-amber-600" : "text-sky-600"} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900">{visibleAlert.title}</div>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-700">{visibleAlert.message}</p>
              <p className="mt-1 text-[11px] font-black text-slate-900">الإجراء المقترح: {visibleAlert.action}</p>
            </div>
            <button type="button" onClick={dismissAlert} className="rounded-lg p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700" aria-label="إخفاء هذا التنبيه">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {QUICK_QUESTIONS.map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-sm ring-1 ring-slate-200/70 transition hover:bg-slate-50">{item}</button>
        ))}
      </div>
      <div className="mt-2.5 rounded-xl bg-white/80 px-3 py-3 text-xs font-bold leading-6 text-slate-700">{answer}</div>
    </section>
  );
}
