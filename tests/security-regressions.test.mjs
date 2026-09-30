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
  const source = read("src/app/api/telemetry/route.ts");
  // The write and the summary/alert work must be in separate try blocks, and the
  // second must not return 503 — otherwise the gateway retries and duplicates rows.
  const postProcessing = source.slice(source.indexOf("post_processing_failed") - 400);
  assert.match(source, /console\.error\("\[telemetry\] post_processing_failed"/);
  assert.doesNotMatch(postProcessing, /telemetry_write_failed/);
  assert.match(source, /stale: ageSeconds > STALE_AFTER_SEC/);
});

test("telemetry ingest reports a missing ingest token instead of a bare 401", () => {
  const source = read("src/app/api/telemetry/route.ts");
  assert.match(source, /telemetry_token_not_configured/);
  assert.match(source, /timingSafeEqual/);
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
