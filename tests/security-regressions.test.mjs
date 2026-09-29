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
  const source = read("prisma/migrations/20260930100000_add_smartess_datalogger_metadata/migration.sql");
  assert.equal((source.match(/ADD COLUMN IF NOT EXISTS/g) ?? []).length, 7);
  assert.doesNotMatch(source, /ADD COLUMN "(?:dataloggerPn|dataloggerType|dataloggerFirmware|dataloggerStationName|dataloggerDeviceIdentifier|dataloggerUpdateIntervalSec|dataloggerCloud)"/);
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
  const migration = read("prisma/migrations/20260930123000_align_shamsak_hardware_defaults/migration.sql");
  assert.match(schema, /batteryCapacityWh Float @default\(4800\)/);
  assert.match(schema, /inverterModel String @default\("NEXT - Victor Max 8\.2KW"\)/);
  assert.match(schema, /protocol String @default\("Wi-Fi Datalogger"\)/);
  assert.match(schema, /timeoutMs Int @default\(1000\)/);
  assert.match(connectionRoute, /batteryCapacityWh: input\.batteryCapacityWh !== undefined \? input\.batteryCapacityWh : 4800/);
  assert.match(migration, /SET DEFAULT 4800/);
  assert.match(migration, /NEXT - Victor Max 8\.2KW/);
  assert.match(migration, /Wi-Fi Datalogger/);
});

test("gateway SSRF guard blocks loopback and private IPv4 ranges", () => {
  const source = read("src/app/api/inverter/test/route.ts");
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /192\.168\./);
  assert.match(source, /169\.254\./);
  assert.match(source, /::ffff:/);
});
