import { spawnSync } from "node:child_process";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error(
    "[Shamsak] Missing database connection. Configure DATABASE_URL (preferred), PRISMA_DATABASE_URL, or POSTGRES_URL."
  );
  process.exit(1);
}

const env = {
  ...process.env,
  // Prisma schema currently uses DATABASE_URL. Resolve the supported aliases
  // before starting Prisma so all build environments use the same datasource.
  DATABASE_URL: databaseUrl,
};

const runner = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args) {
  const result = spawnSync(runner, args, {
    stdio: "inherit",
    env,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  process.exitCode = result.status ?? 1;
  if (process.exitCode !== 0) process.exit(process.exitCode);
}

run(["prisma", "generate"]);
run(["next", "build"]);
