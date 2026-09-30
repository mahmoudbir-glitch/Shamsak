import { createHash } from "node:crypto";

/**
 * Client for the DESSMonitor / SmartESS cloud, which is what the Wi-Fi Plug Pro
 * datalogger reports to. Reading from here needs no extra hardware: the dongle
 * is already pushing to it.
 *
 * The API is not publicly documented by the vendor. The request format below
 * matches what the SmartESS app itself sends and what several open-source
 * clients implement, so treat the response shape as unverified until a real
 * call succeeds — `raw` is carried through on every read precisely so the first
 * live response can be inspected instead of guessed at.
 *
 * Auth model:
 *   salt = milliseconds since epoch
 *   before a token exists:  sign = sha1(salt + sha1(password) + actionString)
 *   once authenticated:     sign = sha1(salt + secret + token + actionString)
 *   actionString = "&action=<name>&<k>=<v>..." with values URL-encoded
 */

const DEFAULT_BASE_URL = "https://api.dessmonitor.com/public/";
const DEFAULT_SOURCE = "1";
const DEFAULT_COMPANY_KEY = "bnrl_frRFjEz8Mkn";

const sha1 = (value: string) => createHash("sha1").update(value, "utf8").digest("hex");

export type DessAuth = {
  token: string;
  secret: string;
  /** Epoch milliseconds after which the token should be refreshed. */
  expiresAt: number;
  usr?: string;
};

export type DessConfig = {
  username: string;
  password: string;
  companyKey?: string;
  baseUrl?: string;
  source?: string;
};

export type DessDevice = {
  pn: string;
  devcode: number;
  devaddr: number;
  sn: string;
};

export class DessError extends Error {
  readonly code: number | string;
  readonly raw: unknown;
  constructor(message: string, code: number | string, raw?: unknown) {
    super(message);
    this.name = "DessError";
    this.code = code;
    this.raw = raw;
  }
}

function buildActionString(action: string, params: Record<string, string | number | undefined>) {
  let actionString = `&action=${action}`;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    actionString += `&${key}=${encodeURIComponent(String(value))}`;
  }
  return actionString;
}

async function call(
  baseUrl: string,
  signature: string,
  salt: string,
  actionString: string,
  token: string | undefined,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  let url = `${baseUrl}?sign=${signature}&salt=${salt}`;
  if (token) url += `&token=${token}`;
  url += actionString;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new DessError(`DESSMonitor returned HTTP ${response.status}`, response.status);
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new DessError("DESSMonitor returned a non-JSON body", "invalid_json");

  // The API signals failure in the body with err != 0, not via HTTP status.
  const err = Number(body.err ?? 0);
  if (err !== 0) {
    throw new DessError(String(body.desc ?? `DESSMonitor error ${err}`), err, body);
  }
  return body;
}

/**
 * SmartESS user names are case-sensitive and phone keyboards silently
 * lower-case or capitalise them, so "Mahmoudbir" typed as "mahmoudbir" is
 * reported as an unknown user. On that specific error, retry the common
 * spellings before giving up. Any other error (wrong password, network) is
 * returned immediately so a bad password is never guessed at.
 */
export async function authenticate(config: DessConfig, timeoutMs = 15000): Promise<DessAuth> {
  const typed = config.username.trim();
  const variants = Array.from(
    new Set([typed, typed.charAt(0).toUpperCase() + typed.slice(1), typed.toLowerCase()]),
  );
  let lastError: unknown;
  for (const username of variants) {
    try {
      return await authenticateExact({ ...config, username }, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!(error instanceof DessError) || !/NOT_FOUND_USR/i.test(error.message)) throw error;
    }
  }
  throw lastError;
}

/** Logs in and returns the token/secret pair used to sign later requests. */
async function authenticateExact(config: DessConfig, timeoutMs = 15000): Promise<DessAuth> {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const salt = String(Date.now());
  const actionString = buildActionString("authSource", {
    usr: config.username,
    "company-key": config.companyKey || DEFAULT_COMPANY_KEY,
    source: config.source || DEFAULT_SOURCE,
    "_app_client_": "web",
    "_app_id_": "shamsak",
    "_app_version_": "1.2.0",
  });

  const signature = sha1(`${salt}${sha1(config.password)}${actionString}`);
  const body = await call(baseUrl, signature, salt, actionString, undefined, timeoutMs);
  const dat = (body.dat ?? {}) as Record<string, unknown>;

  const token = typeof dat.token === "string" ? dat.token : "";
  const secret = typeof dat.secret === "string" ? dat.secret : "";
  if (!token || !secret) {
    throw new DessError("DESSMonitor did not return a token/secret pair", "no_token", body);
  }

  // The API reports a lifetime in seconds; fall back to 7 days, and always
  // renew a little early so a call never lands on an expiring token.
  const expiresIn = Number(dat.expire ?? 0) || 7 * 24 * 3600;
  return {
    token,
    secret,
    expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
    usr: typeof dat.usr === "string" ? dat.usr : config.username,
  };
}

async function authedCall(
  auth: DessAuth,
  action: string,
  params: Record<string, string | number | undefined>,
  baseUrl = DEFAULT_BASE_URL,
  timeoutMs = 15000,
) {
  const salt = String(Date.now());
  const actionString = buildActionString(action, params);
  const signature = sha1(`${salt}${auth.secret}${auth.token}${actionString}`);
  return call(baseUrl, signature, salt, actionString, auth.token, timeoutMs);
}

/** Lists the dataloggers ("collectors") on the account. */
export async function listCollectors(auth: DessAuth, baseUrl?: string, timeoutMs?: number) {
  const body = await authedCall(auth, "webQueryCollectorsEs", { page: 0, pagesize: 50 }, baseUrl, timeoutMs);
  const dat = (body.dat ?? {}) as Record<string, unknown>;
  const collectors = Array.isArray(dat.collector) ? dat.collector : [];
  return collectors as Array<Record<string, unknown>>;
}

/** Lists the devices (inverters) reporting through the account. */
export async function listDevices(auth: DessAuth, baseUrl?: string, timeoutMs?: number) {
  const body = await authedCall(auth, "webQueryDeviceEs", { page: 0, pagesize: 50 }, baseUrl, timeoutMs);
  const dat = (body.dat ?? {}) as Record<string, unknown>;
  const devices = Array.isArray(dat.device) ? dat.device : [];
  return devices as Array<Record<string, unknown>>;
}

export type DessReading = {
  solarPowerW?: number;
  loadPowerW?: number;
  batterySoc?: number;
  batteryVoltage?: number;
  batteryCurrent?: number;
  batteryPowerW?: number;
  batteryTemperature?: number;
  acOutputVoltage?: number;
  gridVoltage?: number;
  gridPowerW?: number;
  gridConnected?: boolean;
  /** Every parameter the API returned, flattened to label -> value. */
  parameters: Record<string, { value: string; unit: string }>;
  /** Unmodified response body, for diagnosing a mapping that came back empty. */
  raw: unknown;
};

/**
 * Parameter labels differ between firmware versions and device codes, so the
 * mapper matches on the human-readable label rather than a fixed key.
 *
 * The patterns below are anchored on labels observed in the SmartESS app for
 * this installation (device SN 55355535553555): "AC output voltage",
 * "Battery discharge current", "Grid voltage", plus the flow-diagram values for
 * solar power, load and battery percentage. Other spellings this class of
 * device is known to use are accepted too. Anything unmatched still reaches the
 * caller through `parameters`, and `raw` keeps the untouched body.
 */
const FIELD_PATTERNS: Array<[keyof DessReading, RegExp, string?]> = [
  ["solarPowerW", /\b(pv|solar)\b.*\b(power|charging power)\b/i, "W"],
  ["loadPowerW", /\b(load|output)\b.*\b(power|apparent|active)\b/i, "W"],
  ["batterySoc", /\b(battery|batt)\b.*\b(capacity|soc|percent|level)\b/i, "%"],
  ["batteryVoltage", /\b(battery|batt)\b.*\bvoltage\b/i, "V"],
  ["batteryPowerW", /\b(battery|batt)\b.*\bpower\b/i, "W"],
  ["batteryTemperature", /\b(battery|batt)\b.*\btemp/i],
  ["acOutputVoltage", /\bac\s*output\b.*\bvoltage\b/i, "V"],
  ["gridVoltage", /\b(grid|utility|ac\s*input|mains)\b.*\bvoltage\b/i, "V"],
  ["gridPowerW", /\b(grid|utility|mains)\b.*\bpower\b/i, "W"],
];

/**
 * Battery current is reported as two separate one-way parameters. The app's
 * convention is a single signed number: positive charging, negative discharging.
 */
const CHARGE_CURRENT = /\b(battery|batt)\b.*\bchargn?(e|ing)?\b.*\bcurrent\b/i;
const DISCHARGE_CURRENT = /\b(battery|batt)\b.*\bdischarg\w*\b.*\bcurrent\b/i;
const GENERIC_CURRENT = /\b(battery|batt)\b.*\bcurrent\b/i;

function toNumber(value: string) {
  const parsed = Number(String(value).replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function mapReading(body: Record<string, unknown>): DessReading {
  const dat = (body.dat ?? {}) as Record<string, unknown>;
  const parameters: Record<string, { value: string; unit: string }> = {};

  // dat.pars is an object of groups, each an array of {id,par,val,unit}.
  const pars = (dat.pars ?? {}) as Record<string, unknown>;
  for (const group of Object.values(pars)) {
    if (!Array.isArray(group)) continue;
    for (const entry of group) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      const label = String(item.par ?? item.id ?? "").trim();
      if (!label) continue;
      parameters[label] = { value: String(item.val ?? ""), unit: String(item.unit ?? "") };
    }
  }

  const reading: DessReading = { parameters, raw: body };
  const entries = Object.entries(parameters);

  for (const [field, pattern, expectedUnit] of FIELD_PATTERNS) {
    if (reading[field] !== undefined) continue;
    for (const [label, { value, unit }] of entries) {
      if (!pattern.test(label)) continue;
      if (expectedUnit && unit && !unit.includes(expectedUnit)) continue;
      const numeric = toNumber(value);
      if (numeric === undefined) continue;
      (reading as Record<string, unknown>)[field] = numeric;
      break;
    }
  }

  // Signed battery current: charging positive, discharging negative. A
  // one-way parameter reading 0 means that direction is simply inactive, so
  // whichever is non-zero wins rather than whichever appears first.
  let charge: number | undefined;
  let discharge: number | undefined;
  let generic: number | undefined;
  for (const [label, { value }] of entries) {
    const numeric = toNumber(value);
    if (numeric === undefined) continue;
    if (DISCHARGE_CURRENT.test(label)) discharge ??= numeric;
    else if (CHARGE_CURRENT.test(label)) charge ??= numeric;
    else if (GENERIC_CURRENT.test(label)) generic ??= numeric;
  }
  if (charge !== undefined && charge !== 0) reading.batteryCurrent = Math.abs(charge);
  else if (discharge !== undefined && discharge !== 0) reading.batteryCurrent = -Math.abs(discharge);
  else if (generic !== undefined) reading.batteryCurrent = generic;
  else if (charge !== undefined || discharge !== undefined) reading.batteryCurrent = 0;

  // Derive battery power when only voltage and current are reported.
  if (reading.batteryPowerW === undefined && reading.batteryVoltage !== undefined && reading.batteryCurrent !== undefined) {
    reading.batteryPowerW = Math.round(reading.batteryVoltage * reading.batteryCurrent);
  }

  if (reading.gridVoltage !== undefined) {
    // Lebanon's grid is out more often than not; a dead AC input reads 0V.
    // Anything under 50V is not a live 230V mains.
    reading.gridConnected = reading.gridVoltage > 50;
  }

  return reading;
}

/** Reads the latest values the datalogger has uploaded for one device. */
export async function readLastData(
  auth: DessAuth,
  device: DessDevice,
  baseUrl?: string,
  timeoutMs?: number,
): Promise<DessReading> {
  const body = await authedCall(
    auth,
    "querySPDeviceLastData",
    {
      source: DEFAULT_SOURCE,
      devcode: device.devcode,
      pn: device.pn,
      devaddr: device.devaddr,
      sn: device.sn,
      i18n: "en_US",
    },
    baseUrl,
    timeoutMs,
  );
  return mapReading(body);
}

/** Plain-language (Arabic) explanation of the vendor's error codes. */
export function describeDessError(error: unknown): string {
  if (!(error instanceof DessError)) return "تعذر الوصول إلى خادم SmartESS من شمسك.";
  const text = String(error.message || "");
  if (/NOT_FOUND_USR/i.test(text)) return "اسم المستخدم غير موجود في SmartESS. جرّب الإيميل الذي تسجّل به.";
  if (/PASSWORD/i.test(text)) return "كلمة مرور SmartESS غير صحيحة.";
  if (/NOT_FOUND_DEVICE/i.test(text)) {
    return "تم تسجيل الدخول بنجاح، لكن الحساب لا يحتوي أي انفرتر مرتبط بالدنجل. أضف الانفرتر من تطبيق SmartESS (الجهاز ثم +) وتأكد أن الدنجل متصل.";
  }
  return `SmartESS رفض الطلب: ${text}`;
}
