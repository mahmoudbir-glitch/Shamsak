export type BatteryState = "charging" | "discharging" | "idle";
export type EnergySnapshot = {
  timestamp: string;
  solarPowerW: number;
  homePowerW: number;
  gridPowerW: number;
  batteryPowerW: number;
  batterySoc: number;
  batteryVoltage?: number;
  batteryCurrent?: number;
  batteryTemperature?: number;
  gridConnected: boolean;
  gridVoltage?: number;
  inverterTemperature?: number;
  loadPercent?: number;
  operatingMode?: string;
  outputPriority?: string;
  chargerPriority?: string;
  source: "live" | "demo";
  todayProductionKWh?: number;
  todayHomeUsageKWh?: number;
  todayGridSavings?: number;
  /** True when the latest stored reading is older than the live window. */
  stale?: boolean;
  /** Currency code from the settings, for money figures. */
  currency?: string;
};

export const demoSnapshot: EnergySnapshot = {
  timestamp: "2026-01-01T12:00:00.000Z",
  solarPowerW: 5827,
  homePowerW: 1299,
  gridPowerW: -452,
  batteryPowerW: 4976,
  batterySoc: 78,
  batteryVoltage: 25.6,
  batteryCurrent: 194,
  batteryTemperature: 29,
  gridConnected: true,
  source: "demo",
};

export function batteryState(w: number): BatteryState {
  return w > 50 ? "charging" : w < -50 ? "discharging" : "idle";
}

export function batteryStateLabel(state: BatteryState) {
  return state === "charging" ? "تشحن" : state === "discharging" ? "تفرغ" : "ثابتة";
}

export function gridLabel(w: number, connected: boolean) {
  if (!connected) return "الشبكة مفصولة";
  return w > 50 ? "سحب من الشبكة" : w < -50 ? "تصدير إلى الشبكة" : "غير مستخدمة الآن";
}

export function energyBalance(s: EnergySnapshot) {
  const solar = s.solarPowerW / 1000;
  const gridImport = Math.max(s.gridPowerW, 0) / 1000;
  const gridExport = Math.max(-s.gridPowerW, 0) / 1000;
  const batteryCharge = Math.max(s.batteryPowerW, 0) / 1000;
  const batteryDischarge = Math.max(-s.batteryPowerW, 0) / 1000;
  const load = s.homePowerW / 1000;
  return { solar, gridImport, gridExport, batteryCharge, batteryDischarge, load, residual: solar + gridImport + batteryDischarge - load - batteryCharge - gridExport };
}

export function kwhFromPower(powerW: number, hours: number) {
  return Math.max(0, powerW) / 1000 * Math.max(0, hours);
}


export type SemanticTone = "neutral" | "green" | "cyan" | "blue" | "amber" | "orange" | "red";

export function batteryTone(soc: number): SemanticTone {
  if (!Number.isFinite(soc)) return "neutral";
  if (soc >= 70) return "green";
  if (soc >= 35) return "amber";
  if (soc >= 15) return "amber";
  return "red";
}

export function solarTone(powerKw: number, panelCapacityKw?: number): SemanticTone {
  if (!Number.isFinite(powerKw) || powerKw <= 0) return "neutral";
  if (panelCapacityKw && panelCapacityKw > 0) {
    const ratio = powerKw / panelCapacityKw;
    if (ratio >= 0.7) return "green";
    if (ratio >= 0.25) return "cyan";
    return "blue";
  }
  if (powerKw >= 4) return "green";
  if (powerKw >= 1) return "cyan";
  return "blue";
}

export function loadTone(powerKw: number): SemanticTone {
  if (!Number.isFinite(powerKw) || powerKw <= 0) return "neutral";
  if (powerKw >= 5) return "red";
  if (powerKw >= 2) return "amber";
  return "blue";
}

export function surplusTone(surplusKw: number): SemanticTone {
  if (!Number.isFinite(surplusKw) || Math.abs(surplusKw) < 0.05) return "neutral";
  return surplusKw > 0 ? "green" : "orange";
}

export function moneyTone(amount: number): SemanticTone {
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.0001) return "neutral";
  return amount > 0 ? "green" : "red";
}

export const semanticText: Record<SemanticTone, string> = {
  neutral: "text-slate-500", green: "text-emerald-600", cyan: "text-cyan-600",
  blue: "text-blue-600", amber: "text-amber-600", orange: "text-amber-600", red: "text-red-600",
};

export const semanticIcon: Record<SemanticTone, string> = {
  neutral: "text-slate-400", green: "text-emerald-500", cyan: "text-cyan-500",
  blue: "text-blue-500", amber: "text-amber-500", orange: "text-amber-500", red: "text-red-500",
};

export const semanticBg: Record<SemanticTone, string> = {
  neutral: "bg-slate-100", green: "bg-emerald-50", cyan: "bg-cyan-50", blue: "bg-blue-50",
  amber: "bg-amber-50", orange: "bg-amber-50", red: "bg-red-50",
};

export const semanticBorder: Record<SemanticTone, string> = {
  neutral: "border-slate-200", green: "border-emerald-200", cyan: "border-cyan-200", blue: "border-blue-200",
  amber: "border-amber-200", orange: "border-amber-200", red: "border-red-200",
};

/** Arabic wording for the inverter's own status texts; unknown texts pass through. */
export function inverterModeLabel(mode?: string) {
  if (!mode) return "—";
  if (/off.?grid|battery/i.test(mode)) return "من البطارية (خارج الشبكة)";
  if (/line|grid|utility|bypass/i.test(mode)) return "من الشبكة";
  if (/standby/i.test(mode)) return "استعداد";
  if (/fault/i.test(mode)) return "عطل";
  return mode;
}

export function outputPriorityLabel(value?: string) {
  if (!value) return "—";
  if (/sbu/i.test(value)) return "شمس ← بطارية ← شبكة (SBU)";
  if (/sub|solar/i.test(value)) return "شمس ← شبكة ← بطارية (SUB)";
  if (/uti|utility/i.test(value)) return "الشبكة أولاً";
  return value;
}

export function chargerPriorityLabel(value?: string) {
  if (!value) return "—";
  if (/only\s*pv/i.test(value)) return "من الشمس فقط";
  if (/pv.*(and|&|\+).*(utility|grid)|solar.*utility|snu/i.test(value)) return "من الشمس والشبكة";
  if (/utility|grid/i.test(value)) return "من الشبكة";
  return value;
}
