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

/** Logs in and returns the token/secret pair used to sign later requests. */
export async function authenticate(config: DessConfig, timeoutMs = 15000): Promise<DessAuth> {
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
 * mapper matches on substrings of the human-readable label rather than on a
 * fixed key. Anything it cannot place still reaches the caller through
 * `parameters`, and `raw` keeps the untouched body.
 */
const FIELD_PATTERNS: Array<[keyof DessReading, RegExp, string?]> = [
  ["solarPowerW", /\b(pv|solar).*(power|输出功率)\b/i, "W"],
  ["loadPowerW", /\b(load|output).*(power|active)\b/i, "W"],
  ["batterySoc", /\b(battery|batt).*(capacity|soc|percent)\b/i, "%"],
  ["batteryVoltage", /\b(battery|batt).*voltage\b/i, "V"],
  ["batteryCurrent", /\b(battery|batt).*current\b/i, "A"],
  ["batteryPowerW", /\b(battery|batt).*power\b/i, "W"],
  ["batteryTemperature", /\b(battery|batt).*temp/i, "°C"],
  ["gridVoltage", /\b(grid|utility|ac\s*input).*voltage\b/i, "V"],
  ["gridPowerW", /\b(grid|utility).*power\b/i, "W"],
];

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

  for (const [field, pattern, expectedUnit] of FIELD_PATTERNS) {
    if (reading[field] !== undefined) continue;
    for (const [label, { value, unit }] of Object.entries(parameters)) {
      if (!pattern.test(label)) continue;
      if (expectedUnit && unit && unit !== expectedUnit && !unit.includes(expectedUnit)) continue;
      const numeric = toNumber(value);
      if (numeric === undefined) continue;
      (reading as Record<string, unknown>)[field] = numeric;
      break;
    }
  }

  if (reading.gridVoltage !== undefined) {
    // Lebanon's grid is out more often than not; a dead AC input reads 0V.
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
