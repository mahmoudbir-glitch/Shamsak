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
  source: "live" | "demo";
  todayProductionKWh?: number;
  todayHomeUsageKWh?: number;
  todayGridSavings?: number;
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
  return w > 50 ? "سحب من الشبكة" : w < -50 ? "تصدير إلى الشبكة" : "متوازنة";
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
  if (soc >= 15) return "orange";
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
  if (powerKw >= 2) return "orange";
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
  blue: "text-blue-600", amber: "text-amber-600", orange: "text-orange-600", red: "text-red-600",
};

export const semanticIcon: Record<SemanticTone, string> = {
  neutral: "text-slate-400", green: "text-emerald-500", cyan: "text-cyan-500",
  blue: "text-blue-500", amber: "text-amber-500", orange: "text-orange-500", red: "text-red-500",
};

export const semanticBg: Record<SemanticTone, string> = {
  neutral: "bg-slate-100", green: "bg-emerald-50", cyan: "bg-cyan-50", blue: "bg-blue-50",
  amber: "bg-amber-50", orange: "bg-orange-50", red: "bg-red-50",
};

export const semanticBorder: Record<SemanticTone, string> = {
  neutral: "border-slate-200", green: "border-emerald-200", cyan: "border-cyan-200", blue: "border-blue-200",
  amber: "border-amber-200", orange: "border-orange-200", red: "border-red-200",
};
