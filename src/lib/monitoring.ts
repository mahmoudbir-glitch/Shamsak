import { prisma } from "@/lib/prisma";

export const MONITORING_ACTIONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  APP_OPEN: "APP_OPEN",
  INVERTER_CONFIG_SAVED: "INVERTER_CONFIG_SAVED",
  CONNECTION_TEST: "CONNECTION_TEST",
  CONNECTION_TEST_SUCCESS: "CONNECTION_TEST_SUCCESS",
  CONNECTION_TEST_FAILED: "CONNECTION_TEST_FAILED",
  TELEMETRY_RECEIVED: "TELEMETRY_RECEIVED",
} as const;

export async function recordMonitoringEvent(input: {
  action: string;
  username?: string | null;
  success?: boolean;
  details?: string | null;
}) {
  try {
    await prisma.monitoringEvent.create({
      data: {
        action: input.action,
        username: input.username || null,
        success: input.success ?? true,
        details: input.details ? input.details.slice(0, 500) : null,
      },
    });
  } catch (error) {
    console.error("[monitoring] event_write_failed", error);
  }
}
