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

export const apiAdapter: EnergyDataAdapter = {
  name: "Shamsak Telemetry API",
  mode: "live",
  async getSnapshot() {
    const response = await fetch("/api/telemetry", { cache: "no-store" });
    if (!response.ok) throw new Error("live telemetry unavailable");
    const data = (await response.json()) as EnergySnapshot;
    return { ...data, source: "live" };
  },
};

export async function getEnergySnapshot(): Promise<EnergySnapshot> {
  try {
    return await apiAdapter.getSnapshot();
  } catch {
    return demoAdapter.getSnapshot();
  }
}

export function getEnergyAdapter(): EnergyDataAdapter {
  return apiAdapter;
}
