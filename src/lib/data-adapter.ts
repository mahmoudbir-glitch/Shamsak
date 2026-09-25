import { demoSnapshot, EnergySnapshot } from "@/lib/energy";

export interface EnergyDataAdapter {
  readonly name: string;
  readonly mode: "demo" | "live";
  getSnapshot(): Promise<EnergySnapshot>;
}

export const demoAdapter: EnergyDataAdapter = {
  name: "Demo",
  mode: "demo",
  async getSnapshot() {
    return {
      ...demoSnapshot,
      timestamp: new Date().toISOString(),
    };
  },
};

export function getEnergyAdapter(): EnergyDataAdapter {
  // Real inverter/API adapters can be registered here later.
  return demoAdapter;
}
