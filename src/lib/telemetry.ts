import { z } from "zod";
import type { EnergySnapshot } from "@/lib/energy";

export const telemetryInputSchema = z.object({
  timestamp: z.string().datetime().optional(),
  pv_power: z.number().finite().min(0),
  load_power: z.number().finite().min(0),
  battery_soc: z.number().finite().min(0).max(100),
  battery_power: z.number().finite(),
  battery_voltage: z.number().finite().nonnegative().optional(),
  battery_current: z.number().finite().optional(),
  battery_temperature: z.number().finite().optional(),
  grid_status: z.boolean(),
  grid_power: z.number().finite().optional(),
  source: z.string().min(1).max(64).default("inverter"),
});

export type TelemetryInput = z.infer<typeof telemetryInputSchema>;

export function telemetryToSnapshot(input: TelemetryInput): EnergySnapshot {
  return {
    timestamp: input.timestamp ?? new Date().toISOString(),
    solarPowerW: input.pv_power,
    homePowerW: input.load_power,
    gridPowerW: input.grid_power ?? 0,
    batteryPowerW: input.battery_power,
    batterySoc: input.battery_soc,
    batteryVoltage: input.battery_voltage,
    batteryCurrent: input.battery_current,
    batteryTemperature: input.battery_temperature,
    gridConnected: input.grid_status,
    source: "live",
  };
}
