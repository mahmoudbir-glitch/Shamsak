import { spawnSync } from "node:child_process";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "postgresql://placeholder:placeholder@127.0.0.1:5432/shamsak?schema=public";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "generate"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
