import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[Shamsak] Missing DATABASE_URL. Configure the canonical Prisma/PostgreSQL connection string.");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: databaseUrl };
const runner = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args) {
  const result = spawnSync(runner, args, { stdio: "inherit", env });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  process.exitCode = result.status ?? 1;
  if (process.exitCode !== 0) process.exit(process.exitCode);
}

run(["prisma", "generate"]);
run(["next", "build"]);
