import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("telemetry summary endpoint requires an authenticated session", () => {
  const source = read("src/app/api/telemetry/summary/route.ts");
  assert.match(source, /verifySessionToken\(/);
  assert.match(source, /if \(!session\).*401/s);
});

test("initial battery capacity remains aligned with Shamsak defaults", () => {
  const source = read("src/app/api/settings/route.ts");
  assert.match(source, /batteryCapacityWh:\s*4800/);
});

test("SmartESS datalogger migration is safe when columns already exist", () => {
  // The per-feature migrations were squashed into 0_init_baseline; assert against it
  // so this regression test keeps protecting re-runnable DDL instead of a deleted path.
  const source = read("prisma/migrations/0_init_baseline/migration.sql");
  const dataloggerColumns = [
    "dataloggerPn",
    "dataloggerType",
    "dataloggerFirmware",
    "dataloggerStationName",
    "dataloggerDeviceIdentifier",
    "dataloggerUpdateIntervalSec",
    "dataloggerCloud",
  ];
  for (const column of dataloggerColumns) {
    assert.match(source, new RegExp(`ADD COLUMN IF NOT EXISTS "${column}"`), `${column} must be added conditionally`);
  }
  // No unconditional ADD COLUMN anywhere: a re-run on an existing database must not fail.
  assert.doesNotMatch(source, /ADD COLUMN "/);
});

test("login failures do not reveal whether the username exists", () => {
  const source = read("src/app/api/auth/login/route.ts");
  assert.match(source, /error:\s*"invalid_credentials"/);
  assert.doesNotMatch(source, /error:\s*usernameOk\s*\?/);
});

test("logout uses a full navigation to prevent stale protected pages", () => {
  const source = read("src/components/logout-button.tsx");
  assert.match(source, /window\.location\.replace\(["']\/login["']\)/);
});


test("database and inverter defaults match the real Shamsak hardware", () => {
  const schema = read("prisma/schema.prisma");
  const connectionRoute = read("src/app/api/inverter/connection/route.ts");
  const migration = read("prisma/migrations/0_init_baseline/migration.sql");
  assert.match(schema, /batteryCapacityWh Float @default\(4800\)/);
  assert.match(schema, /inverterModel String @default\("NEXT - Victor Max 8\.2KW"\)/);
  assert.match(schema, /protocol String @default\("Wi-Fi Datalogger"\)/);
  assert.match(schema, /timeoutMs Int @default\(1000\)/);
  assert.match(connectionRoute, /batteryCapacityWh: input\.batteryCapacityWh !== undefined \? input\.batteryCapacityWh : 4800/);
  assert.match(migration, /SET DEFAULT 4800/);
  assert.match(migration, /NEXT - Victor Max 8\.2KW/);
  assert.match(migration, /Wi-Fi Datalogger/);
});

test("quiet hours accept real clock times", () => {
  const source = read("src/app/api/settings/route.ts");
  const declaration = source.match(/const TIME_HHMM = (\/.+\/);/);
  assert.ok(declaration, "settings route must declare a shared TIME_HHMM matcher");
  // Rebuild the matcher from the source literal so an escaping mistake fails the test.
  const pattern = new RegExp(declaration[1].slice(1, -1));
  for (const valid of ["00:00", "08:30", "13:45", "23:59"]) {
    assert.ok(pattern.test(valid), `${valid} must be accepted as a quiet-hours time`);
  }
  for (const invalid of ["24:00", "8:30", "12:60", "abcd"]) {
    assert.ok(!pattern.test(invalid), `${invalid} must be rejected`);
  }
});

test("telemetry ingest keeps a stored reading even if post-processing fails", () => {
  const store = read("src/lib/telemetry-store.ts");
  const source = store + read("src/app/api/telemetry/route.ts");
  // The write and the summary/alert work must be in separate try blocks, and the
  // second must not return 503 — otherwise the gateway retries and duplicates rows.
  const postProcessing = store.slice(store.indexOf("post_processing_failed") - 400);
  assert.match(source, /console\.error\("\[telemetry\] post_processing_failed"/);
  assert.doesNotMatch(postProcessing, /telemetry_write_failed/);
  assert.match(source, /stale: ageSeconds > STALE_AFTER_SEC/);
});

test("telemetry ingest reports a missing ingest token instead of a bare 401", () => {
  const source = read("src/app/api/telemetry/route.ts");
  assert.match(source, /telemetry_token_not_configured/);
  assert.match(source, /timingSafeEqual/);
});

test("RLS migration does not assume Supabase roles exist", () => {
  // Deployed as-is, `CREATE POLICY ... TO anon` aborted with `role "anon" does
  // not exist` on Prisma Postgres, leaving a failed migration that blocked every
  // later deploy with P3009. RLS itself must still be enabled unconditionally.
  const source = read("prisma/migrations/20260930140000_enable_rls_deny_public_roles/migration.sql");
  assert.match(source, /ALTER TABLE "InverterConnection" ENABLE ROW LEVEL SECURITY/);
  assert.match(source, /ALTER TABLE "EnergySettings" ENABLE ROW LEVEL SECURITY/);
  assert.match(source, /FROM pg_roles WHERE rolname/, "policies must be guarded by a role-existence check");
  assert.doesNotMatch(source, /^\s*CREATE POLICY .* TO (anon|authenticated)/m, "no unguarded CREATE POLICY for a Supabase role");
});

test("the test script survives the Node version CI runs", () => {
  // `node --test tests` treats the directory as one test file, and a quoted
  // glob is not expanded by Node 20. The glob must reach the shell unquoted.
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.test, "node --test tests/*.test.mjs");
});

test("output source priority covers every option the inverter offers", () => {
  // SmartESS exposes three: Utility first / Solar first / SBU first. With only
  // SBU and SUB, an installation set to Utility first could not be represented.
  const route = read("src/app/api/settings/route.ts");
  const page = read("src/app/settings/page.tsx");
  assert.match(route, /outputSourcePriority: z\.enum\(\["SBU", "SUB", "UTI"\]\)/);
  assert.match(page, /value="UTI"/);
});

test("nameplate limits match the Victor Max-8.2KW rating label", () => {
  // Transcribed from the label: battery 40-63VDC / 190A, solar charge 160A,
  // AC charge 140A, load cut-off 44VDC, return 52VDC, rated 8.2kW.
  const source = read("src/lib/inverter-limits.ts");
  for (const value of ["minVoltage: 40", "maxVoltage: 63", "maxCurrentA: 190", "maxSolarCurrentA: 160", "maxAcCurrentA: 140", "cutOffVoltage: 44", "returnVoltage: 52", "ratedPowerKw: 8.2"]) {
    assert.ok(source.includes(value), `nameplate value missing: ${value}`);
  }
  assert.match(read("src/app/api/settings/route.ts"), /checkAgainstInverter\(limits, merged\)/);
});

test("stored defaults match the inverter's own load-transfer thresholds", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /lowDcCutoffVoltage Float\? @default\(44\.0\)/);
  assert.match(schema, /backToGridVoltage Float\? @default\(52\.0\)/);
});

test("SmartESS mapper recognises the labels this installation reports", () => {
  // Observed live in SmartESS for device SN 55355535553555:
  //   Grid 0.00V, PV 132W, Battery 75%, Load 194W,
  //   AC output 230.00V, Battery discharge current 1.00A.
  const source = read("src/lib/dessmonitor.ts");
  const patternFor = (field) => {
    const match = source.match(new RegExp(`\\["${field}", (/[^/]+/i)`));
    assert.ok(match, `no pattern declared for ${field}`);
    const body = match[1].slice(1, match[1].lastIndexOf("/"));
    return new RegExp(body, "i");
  };

  const observed = {
    solarPowerW: "PV Input Power",
    loadPowerW: "Output Active Power",
    batterySoc: "Battery Capacity",
    batteryVoltage: "Battery Voltage",
    acOutputVoltage: "AC Output Voltage",
    gridVoltage: "Grid Voltage",
  };
  for (const [field, label] of Object.entries(observed)) {
    assert.ok(patternFor(field).test(label), `${field} must match the label "${label}"`);
  }

  // "AC Output Voltage" must not be mistaken for the grid feed: the two read
  // 230V and 0V at the same moment, so confusing them inverts grid status.
  assert.ok(!patternFor("gridVoltage").test("AC Output Voltage"));

  // Charge and discharge arrive as separate one-way parameters and have to
  // become one signed number, or a discharging battery looks like a charging one.
  assert.match(source, /reading\.batteryCurrent = -Math\.abs\(discharge\)/);
  assert.match(source, /reading\.batteryCurrent = Math\.abs\(charge\)/);
});

test("Wi-Fi datalogger form lets the owner enter SmartESS credentials", () => {
  // The reader needs the SmartESS login, but the form only offered those fields
  // under "Cloud API", so a Wi-Fi Datalogger owner had nowhere to type them.
  const page = read("src/app/settings/page.tsx");
  const section = page.slice(page.indexOf('draft.protocol === "Wi-Fi Datalogger" && ('));
  const wifiBlock = section.slice(0, section.indexOf('draft.connectionMode === "gateway"'));
  assert.match(wifiBlock, /updateDraft\("cloudUsername"/);
  assert.match(wifiBlock, /updateDraft\("cloudPassword"/);
});

test("saving the connection form without retyping a password keeps it", () => {
  const route = read("src/app/api/inverter/connection/route.ts");
  assert.match(route, /preserveSecrets\(existing\?\.inverterLinkCode, extras\)/);
  assert.match(route, /"cloudPassword"/);
});

test("gateway SSRF guard blocks loopback and private IPv4 ranges", () => {
  const source = read("src/lib/net-guard.ts");
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /192\.168\./);
  assert.match(source, /169\.254\./);
  assert.match(source, /::ffff:/);
});

test("both outbound test routes share one SSRF guard", () => {
  // Two divergent copies of this check is how the weaker one silently loses
  // coverage, so neither route may define its own.
  for (const route of ["src/app/api/inverter/test/route.ts", "src/app/api/connection/test/route.ts"]) {
    const source = read(route);
    assert.match(source, /from "@\/lib\/net-guard"/, `${route} must use the shared guard`);
    assert.doesNotMatch(source, /function isPrivateIp/, `${route} must not redefine isPrivateIp`);
  }
});

test("gateway token is recoverable so connection tests authenticate", () => {
  const connection = read("src/app/api/inverter/connection/route.ts");
  const test = read("src/app/api/inverter/test/route.ts");
  assert.match(connection, /gatewayTokenCipher: encryptSecret\(token\)/);
  assert.match(test, /decryptSecret/);
  assert.match(read("prisma/schema.prisma"), /gatewayTokenCipher String\?/);
});

test("connection test saves the form first so typed credentials are used", () => {
  // The test route reads stored credentials; testing before saving reported
  // "credentials missing" even though the owner had just typed them.
  const page = read("src/app/settings/page.tsx");
  const test = page.slice(page.indexOf("const testConnection"));
  assert.match(test.slice(0, 400), /await saveAll\(\)/);
});

test("connection save tolerates nulls the form echoes back", () => {
  // A stored row with no port/QoS made the form send null; Number(null) is 0
  // and z.number() rejects null, so saving failed with 'invalid_connection'.
  const route = read("src/app/api/inverter/connection/route.ts");
  assert.match(route, /if \(value === null\) return false/);
});

test("dashboard polling refreshes readings from SmartESS without blocking", () => {
  const route = read("src/app/api/telemetry/route.ts");
  assert.match(route, /after\(\(\) => \{ void syncSmartEss\(\); \}\)/);
  const sync = read("src/lib/smartess-sync.ts");
  // An offline device's last values must not be stored as live readings.
  assert.match(sync, /Number\(device\.status\) === 1/);
  // Throttled so dashboard polls cannot hammer the vendor API.
  assert.match(sync, /MIN_GAP_MS/);
  // Both the gateway route and the cloud reader store through one function.
  assert.match(read("src/lib/telemetry-store.ts"), /export async function ingestSample/);
  assert.match(route, /ingestSample\(input\)/);
});

test("SmartESS error codes are explained in plain language", () => {
  const source = read("src/lib/dessmonitor.ts");
  for (const code of ["NOT_FOUND_USR", "PASSWORD", "NOT_FOUND_DEVICE"]) {
    assert.match(source, new RegExp(code), `${code} must have its own explanation`);
  }
  assert.match(read("src/app/api/inverter/test/route.ts"), /describeDessError\(error\)/);
});

test("SmartESS login retries user-name spelling only on unknown-user errors", () => {
  const source = read("src/lib/dessmonitor.ts");
  assert.match(source, /NOT_FOUND_USR/);
  // A wrong password must surface at once rather than be retried with variants.
  assert.match(source, /if \(!\(error instanceof DessError\) \|\| !\/NOT_FOUND_USR\/i\.test\(error\.message\)\) throw error;/);
});

test("forecast uses the saved settings, not localStorage keys nothing writes", () => {
  const hook = read("src/hooks/use-smart-energy.ts");
  assert.match(hook, /fetch\("\/api\/settings"/);
  assert.match(hook, /data\.panelPowerW/);
  assert.match(hook, /data\.batteryCapacityWh/);
  // The night-autonomy card must take the capacity from the hook as well.
  const card = read("src/components/smart-forecast.tsx");
  assert.doesNotMatch(card, /localStorage\.getItem\("shamsak_battery_capacity"\)/);
});

test("panel azimuth is converted from compass bearing to Open-Meteo's south-based scale", () => {
  // Compass 180 (south-facing) must become 0; compass 270 (west) must become 90.
  const convert = (az) => ((az % 360) + 360) % 360 - 180;
  assert.equal(convert(180), 0);
  assert.equal(convert(270), 90);
  assert.equal(convert(90), -90);
  for (const file of ["src/app/api/forecast/solar/route.ts", "src/hooks/use-smart-energy.ts"]) {
    assert.match(read(file), /% 360\) \+ 360\) % 360 - 180/, `${file} must convert the bearing`);
  }
});

test("no component or library module is left without a user", () => {
  // Dead modules drift out of date and hide real bugs; keep the tree honest.
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(rel);
    }
  };
  for (const dir of ["src/lib", "src/components", "src/hooks"]) walk(dir);
  const all = [];
  const collect = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(rel);
      else if (/\.(ts|tsx)$/.test(entry.name)) all.push(rel);
    }
  };
  collect("src");
  all.push("middleware.ts");
  const orphans = files.filter((file) => {
    const base = path.basename(file).replace(/\.tsx?$/, "");
    const pattern = new RegExp(`[/"']${base}["']`);
    return !all.some((other) => other !== file && pattern.test(read(other)));
  });
  assert.deepEqual(orphans, [], `unused modules: ${orphans.join(", ")}`);
});

test("failed SmartESS mapping reports what was actually received", () => {
  const sync = read("src/lib/smartess-sync.ts");
  assert.match(sync, /function describeAvailable/);
  assert.match(sync, /القيم المتاحة/);
  // The parameter walk must not depend on a single hard-coded nesting path.
  assert.match(read("src/lib/dessmonitor.ts"), /const visit = \(node: unknown, depth: number\)/);
});
