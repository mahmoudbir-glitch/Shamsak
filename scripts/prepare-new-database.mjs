import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * One-off: brings the database at NEW_DATABASE_URL up to the current schema
 * before data is copied into it with copy-database.mjs. Deletes nothing.
 *
 * That database was created from an older version of 0_init_baseline, so its
 * tables lack columns the later migrations expect. The baseline is safe to run
 * again (every statement is IF NOT EXISTS or SET DEFAULT), which adds them;
 * after that the migration that stopped on a missing column can be retried.
 *
 * Usage: node scripts/prepare-new-database.mjs
 */
const line = readFileSync(".env", "utf8").split(/\r?\n/).find((entry) => entry.startsWith("NEW_DATABASE_URL="));
const url = line?.slice("NEW_DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
if (!url) {
  console.error("[prepare] Set NEW_DATABASE_URL in .env first.");
  process.exit(1);
}

// Run the Prisma CLI with this Node directly: spawning npx.cmd fails on Windows.
const prismaCli = resolve("node_modules/prisma/build/index.js");
function prisma(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    env: { ...process.env, DATABASE_URL: url },
    encoding: "utf8",
  });
  // Prisma can echo the connection string; never print its credentials.
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.replace(/:\/\/[^@\s]*@/g, "://***@");
  console.log(output.trim().split("\n").slice(-12).join("\n"));
  return result.status === 0;
}

console.log("[prepare] 1/3 re-running the baseline to add missing columns");
if (!prisma(["db", "execute", "--file", "prisma/migrations/0_init_baseline/migration.sql", "--schema", "prisma/schema.prisma"])) process.exit(1);

console.log("[prepare] 2/3 clearing the failed migration so it can be retried");
// Fails harmlessly when no migration is in a failed state (e.g. on a second run).
prisma(["migrate", "resolve", "--rolled-back", "20260930190000_correct_datalogger_identity"]);

console.log("[prepare] 3/3 applying the remaining migrations");
if (!prisma(["migrate", "deploy"])) process.exit(1);
console.log("[prepare] Done: the new database has the current schema.");
