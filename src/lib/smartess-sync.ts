import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/inverter-config-crypto";
import { authenticate, DessError, describeDessError, listDevices, pickDevice, readLastData, type DessAuth, type DessReading } from "@/lib/dessmonitor";
import { ingestSample } from "@/lib/telemetry-store";

/**
 * Pulls the latest reading from the SmartESS cloud and stores it as telemetry,
 * so the dashboard works without a local gateway. The datalogger only uploads
 * every few minutes, so polling faster than MIN_GAP_MS gains nothing.
 */
const MIN_GAP_MS = 60_000;
export const SMARTESS_SOURCE = "smartess-cloud";

export type SyncResult = { ok: true; stored: true } | { ok: false; skipped?: boolean; reason: string };

let cachedAuth: { key: string; auth: DessAuth } | null = null;
let inFlight: Promise<SyncResult> | null = null;
let lastAttemptAt = 0;

/**
 * When mapping fails, the only way to fix it is to see what SmartESS actually
 * sent, so put the labels and values (or the payload's shape) in the message.
 */
function describeAvailable(reading: DessReading, device?: Record<string, unknown>): string {
  const entries = Object.entries(reading.parameters);
  if (entries.length) {
    const list = entries.slice(0, 60).map(([label, { value, unit }]) => `${label}=${value}${unit}`).join(" | ");
    return `القيم المتاحة (${entries.length}): ${list}`;
  }
  const body = (reading.raw ?? {}) as Record<string, unknown>;
  const dat = body.dat;
  const shape = dat && typeof dat === "object" ? Object.keys(dat as object).join(",") : String(dat);
  const parsRaw = dat && typeof dat === "object" ? (dat as Record<string, unknown>).pars : undefined;
  const parsText = JSON.stringify(parsRaw ?? null) ?? "null";
  const gts = dat && typeof dat === "object" ? String((dat as Record<string, unknown>).gts ?? "") : "";
  const state = device ? ` حالة الجهاز في SmartESS: status=${String(device.status ?? "؟")}.` : "";
  return `لم يُرجع SmartESS أي قراءات (dat{${shape}}، وقت الرفع: ${gts || "لا يوجد"}، pars=${parsText.slice(0, 120)}).${state} غالباً الدنجل غير متصل بالإنترنت فلا يرفع بيانات؛ تأكد أن ضوء الدنجل ثابت وأن الجهاز يظهر Online في SmartESS.`;
}

/** Converts a mapped reading into a stored sample, or says which fields were missing. */
export async function storeReading(reading: DessReading, device?: Record<string, unknown>): Promise<SyncResult> {
  const missing: string[] = [];
  if (reading.solarPowerW === undefined) missing.push("solarPowerW");
  if (reading.loadPowerW === undefined) missing.push("loadPowerW");
  if (reading.batterySoc === undefined) missing.push("batterySoc");
  if (reading.batteryPowerW === undefined) missing.push("batteryPowerW");
  if (reading.gridConnected === undefined) missing.push("gridConnected");
  if (missing.length) {
    return { ok: false, reason: `لم تُقرأ الحقول التالية من SmartESS: ${missing.join(", ")}. ${describeAvailable(reading, device)}` };
  }

  await ingestSample({
    pv_power: Math.max(0, reading.solarPowerW!),
    load_power: Math.max(0, reading.loadPowerW!),
    battery_soc: Math.min(100, Math.max(0, reading.batterySoc!)),
    battery_power: reading.batteryPowerW!,
    battery_voltage: reading.batteryVoltage !== undefined ? Math.max(0, reading.batteryVoltage) : undefined,
    battery_current: reading.batteryCurrent,
    battery_temperature: reading.batteryTemperature,
    grid_status: reading.gridConnected!,
    grid_power: reading.gridPowerW,
    source: SMARTESS_SOURCE,
  });
  return { ok: true, stored: true };
}

async function run(): Promise<SyncResult> {
  const row = await prisma.inverterConnection.findFirst({
    where: { protocol: "Wi-Fi Datalogger", enabled: true },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
  });
  if (!row) return { ok: false, skipped: true, reason: "no_wifi_datalogger_connection" };

  const fail = async (reason: string): Promise<SyncResult> => {
    await prisma.inverterConnection
      .update({ where: { id: row.id }, data: { lastStatus: "error", lastTestReason: reason } })
      .catch(() => {});
    return { ok: false, reason };
  };

  let extras: Record<string, unknown> = {};
  try {
    const raw = row.inverterLinkCode ? decryptSecret(row.inverterLinkCode) : "";
    if (raw) extras = JSON.parse(raw);
  } catch (error) {
    console.error("[smartess] extras_decrypt_failed", error);
  }
  const username = typeof extras.cloudUsername === "string" ? extras.cloudUsername : "";
  const password = typeof extras.cloudPassword === "string" ? extras.cloudPassword : "";
  if (!username || !password) return { ok: false, skipped: true, reason: "cloud_credentials_missing" };

  const cloudUrl = process.env.SHAMSAK_DESSMONITOR_URL || undefined;
  // Kept short: this runs in the background of a dashboard request.
  const timeout = 8000;

  // Logging in from here can end the session of the owner's phone app, so a
  // login is reused for as long as SmartESS honours it: first from memory, then
  // from the encrypted copy in the database (serverless instances come and go),
  // and only then by signing in again. Saving the connection form clears it.
  const savePersistedAuth = async (auth: DessAuth | null) => {
    const next = { ...extras };
    if (auth) next.dessAuth = { username, auth };
    else delete next.dessAuth;
    await prisma.inverterConnection
      .update({ where: { id: row.id }, data: { inverterLinkCode: encryptSecret(JSON.stringify(next)) } })
      .catch((error) => console.error("[smartess] persist_auth_failed", error));
  };

  try {
    const key = `${username}\u0000${password.length}`;
    let auth: DessAuth | null = cachedAuth && cachedAuth.key === key && cachedAuth.auth.expiresAt > Date.now() ? cachedAuth.auth : null;
    if (!auth) {
      const saved = extras.dessAuth as { username?: string; auth?: DessAuth } | undefined;
      if (saved?.username === username && saved.auth && saved.auth.token && saved.auth.secret && saved.auth.expiresAt > Date.now()) {
        auth = saved.auth;
      }
    }
    if (!auth) {
      auth = await authenticate({ username, password, baseUrl: cloudUrl }, timeout);
      await savePersistedAuth(auth);
    }
    cachedAuth = { key, auth };

    const devices = await listDevices(auth, cloudUrl, timeout);
    const wanted = (row.dataloggerPn || "").trim();
    const device = pickDevice(devices, wanted);
    if (!device) return await fail("تم تسجيل الدخول إلى SmartESS، لكن الحساب لا يحتوي أي جهاز.");

    // SmartESS reports an offline device's last known values as if current.
    // Storing them would show hours-old numbers as live, so refuse.
    if (Number(device.status) === 1) {
      return await fail("الجهاز غير متصل في SmartESS (Offline)، لذلك لم تُحفظ قراءة.");
    }

    const reading = await readLastData(
      auth,
      {
        pn: String(device.pn ?? wanted),
        devcode: Number(device.devcode ?? 0),
        devaddr: Number(device.devaddr ?? 1),
        sn: String(device.sn ?? row.dataloggerDeviceIdentifier ?? ""),
      },
      cloudUrl,
      timeout,
    );

    const stored = await storeReading(reading, device);
    if (!stored.ok) return await fail(stored.reason);
    return stored;
  } catch (error) {
    // A rejected login must be retried with fresh credentials, not a cached token.
    cachedAuth = null;
    // Only a rejected token justifies signing in again; a timeout must not
    // trigger another login, which is what could end the phone app's session.
    if (extras.dessAuth && error instanceof DessError && /token|sign|expire|auth|secret/i.test(error.message)) {
      await savePersistedAuth(null);
    }
    console.error("[smartess] sync_failed", error);
    return await fail(describeDessError(error));
  }
}

/** Safe to call on every dashboard poll: it throttles itself and never throws. */
export async function syncSmartEss(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  const now = Date.now();
  if (now - lastAttemptAt < MIN_GAP_MS) return { ok: false, skipped: true, reason: "throttled" };
  lastAttemptAt = now;

  inFlight = (async () => {
    try {
      // Another server instance may have synced moments ago.
      const latest = await prisma.telemetryLog.findFirst({
        where: { source: SMARTESS_SOURCE },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      });
      if (latest && now - latest.timestamp.getTime() < MIN_GAP_MS) {
        return { ok: false, skipped: true, reason: "recent_sample_exists" } as SyncResult;
      }
      return await run();
    } catch (error) {
      console.error("[smartess] sync_crashed", error);
      return { ok: false, reason: "sync_crashed" } as SyncResult;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
