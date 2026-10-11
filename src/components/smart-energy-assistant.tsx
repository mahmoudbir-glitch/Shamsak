"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import type { EnergySnapshot } from "@/lib/energy";
import { analyzeEnergy } from "@/lib/intelligent-energy";
import { buildSmartAlert } from "@/lib/smart-alerts";

const DISMISSED_ALERT_KEY = "shamsak_dismissed_smart_alert_v1";

type SmartEnergyAssistantProps = { snapshot: EnergySnapshot | null; embedded?: boolean };

export function SmartEnergyAssistant({ snapshot, embedded = false }: SmartEnergyAssistantProps) {
  const [dismissedAlertKey, setDismissedAlertKey] = useState<string | null>(null);
  const insight = useMemo(() => (snapshot ? analyzeEnergy(snapshot) : null), [snapshot]);
  const smartAlert = useMemo(() => (snapshot && insight ? buildSmartAlert(snapshot, insight) : null), [snapshot, insight]);

  useEffect(() => {
    try { setDismissedAlertKey(localStorage.getItem(DISMISSED_ALERT_KEY)); } catch { setDismissedAlertKey(null); }
  }, [smartAlert?.key]);

  const visibleAlert = smartAlert && smartAlert.key !== dismissedAlertKey ? smartAlert : null;
  const dismissAlert = () => {
    if (!smartAlert) return;
    setDismissedAlertKey(smartAlert.key);
    try { localStorage.setItem(DISMISSED_ALERT_KEY, smartAlert.key); } catch {}
  };

  if (!snapshot || snapshot.stale) return (
    <section dir="rtl" className={embedded ? "" : "rounded-2xl border border-sky-200 bg-sky-50 p-3"} aria-label="مساعد شمسك الذكي">
      <div className="flex items-center gap-2 text-xs font-black text-slate-600"><Sparkles size={15} className="text-sky-600" /> لا توجد قراءة حية كافية حالياً.</div>
    </section>
  );

  return (
    <section dir="rtl" className={embedded ? "" : "rounded-2xl border border-sky-200 bg-sky-50 p-3"} aria-label="مساعد شمسك الذكي">
      {visibleAlert ? (
        <div className={`rounded-xl px-3 py-2.5 ${visibleAlert.severity === "critical" ? "border border-rose-200 bg-rose-50" : visibleAlert.severity === "warning" ? "border border-amber-200 bg-amber-50" : "border border-sky-200 bg-sky-50"}`} role="alert" aria-live="assertive">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className={visibleAlert.severity === "critical" ? "text-rose-600" : visibleAlert.severity === "warning" ? "text-amber-600" : "text-sky-600"} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900">{visibleAlert.title}</div>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-700">{visibleAlert.message}</p>
              <p className="mt-1 text-[11px] font-black text-slate-900">الإجراء: {visibleAlert.action}</p>
            </div>
            <button type="button" onClick={dismissAlert} className="rounded-lg p-1 text-slate-400" aria-label="إخفاء هذا التنبيه"><X size={14} /></button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600">
          <Sparkles size={15} className="text-sky-600" />
          <span>لا توجد توصية حالياً.</span>
        </div>
      )}
    </section>
  );
}
