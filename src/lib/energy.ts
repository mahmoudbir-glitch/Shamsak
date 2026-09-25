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
  return {
    solar,
    gridImport,
    gridExport,
    batteryCharge,
    batteryDischarge,
    load,
    residual: solar + gridImport + batteryDischarge - load - batteryCharge - gridExport,
  };
}

export function kwhFromPower(powerW: number, hours: number) {
  return Math.max(0, powerW) / 1000 * Math.max(0, hours);
}
