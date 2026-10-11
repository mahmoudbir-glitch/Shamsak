import type { EnergySnapshot } from "@/lib/energy";
import type { IntelligentInsight } from "@/lib/intelligent-energy";

export type SmartAlertSeverity = "info" | "warning" | "critical";

export type SmartAlert = {
  key: string;
  severity: SmartAlertSeverity;
  title: string;
  message: string;
  action: string;
};

export function buildSmartAlert(
  snapshot: EnergySnapshot,
  insight: IntelligentInsight,
): SmartAlert | null {
  if (snapshot.stale || !insight.alert) return null;

  const severity: SmartAlertSeverity =
    insight.tone === "red" ? "critical" : insight.tone === "amber" ? "warning" : "info";

  const key = `${severity}:${insight.title}`;

  return {
    key,
    severity,
    title: insight.title,
    message: insight.summary,
    action: insight.action,
  };
}
