import { prisma } from "@/lib/prisma";

/**
 * Runs with the per-minute sync. When no reading has been stored for longer
 * than the "offlineMinutes" setting, one ALERT_OFFLINE event is logged for that
 * outage; the first reading afterwards logs ALERT_BACK_ONLINE. The events
 * themselves are the state, so it holds across server instances.
 */

export const OFFLINE_ACTION = "ALERT_OFFLINE";
export const BACK_ONLINE_ACTION = "ALERT_BACK_ONLINE";

export async function runOfflineCheck(now = new Date()) {
  const settings = await prisma.energySettings.findUnique({ where: { id: "default" }, select: { offlineMinutes: true } });
  if (!settings) return;
  const latest = await prisma.telemetryLog.findFirst({ orderBy: { timestamp: "desc" }, select: { timestamp: true } });
  // Never had a reading: the system is not set up yet, which is not an outage.
  if (!latest) return;

  const lastEvent = await prisma.monitoringEvent.findFirst({
    where: { action: { in: [OFFLINE_ACTION, BACK_ONLINE_ACTION] } },
    orderBy: { timestamp: "desc" },
    select: { action: true, timestamp: true },
  });
  const minutes = Math.floor((now.getTime() - latest.timestamp.getTime()) / 60_000);

  if (minutes >= settings.offlineMinutes) {
    // An alert newer than the last reading belongs to this same outage.
    if (lastEvent?.action === OFFLINE_ACTION && lastEvent.timestamp > latest.timestamp) return;
    await prisma.monitoringEvent.create({
      data: { action: OFFLINE_ACTION, success: false, details: `lastReading=${latest.timestamp.toISOString()}; minutes=${minutes}; limit=${settings.offlineMinutes}` },
    });
    console.warn(`[offline] alert minutes=${minutes} limit=${settings.offlineMinutes} lastReading=${latest.timestamp.toISOString()}`);
    return;
  }

  if (lastEvent?.action === OFFLINE_ACTION && latest.timestamp > lastEvent.timestamp) {
    await prisma.monitoringEvent.create({
      data: { action: BACK_ONLINE_ACTION, success: true, details: `reading=${latest.timestamp.toISOString()}` },
    });
    console.info(`[offline] back_online reading=${latest.timestamp.toISOString()}`);
  }
}
