import { readFileSync } from "node:fs";
import { Prisma, PrismaClient } from "@prisma/client";

/**
 * One-off: copies every row from OLD_DATABASE_URL into NEW_DATABASE_URL.
 *
 * The new database must already have the schema (run `prisma migrate deploy`
 * against it first). Rows that already exist there are skipped, so the script
 * can be run again safely, e.g. once more right before switching production
 * over to pick up the readings stored in between.
 *
 * Usage: node scripts/copy-database.mjs            (copy)
 *        node scripts/copy-database.mjs --verify   (only compare row counts)
 */

// Read both URLs from .env without pulling in a dotenv dependency.
function fromEnvFile(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(".env", "utf8").split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
  } catch {
    return undefined;
  }
}

const oldUrl = fromEnvFile("OLD_DATABASE_URL");
const newUrl = fromEnvFile("NEW_DATABASE_URL");
if (!oldUrl || !newUrl) {
  console.error("[copy] Set OLD_DATABASE_URL and NEW_DATABASE_URL in .env first.");
  process.exit(1);
}
if (oldUrl === newUrl) {
  console.error("[copy] OLD_DATABASE_URL and NEW_DATABASE_URL are the same database.");
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: oldUrl } } });
const target = new PrismaClient({ datasources: { db: { url: newUrl } } });
const verifyOnly = process.argv.includes("--verify");
const BATCH = 500;

// Parents before children, so foreign keys are satisfied as rows arrive.
function inDependencyOrder(models) {
  const ordered = [];
  const placed = new Set();
  const pending = [...models];
  while (pending.length) {
    const index = pending.findIndex((model) =>
      model.fields.every((field) => !field.relationFromFields?.length || field.type === model.name || placed.has(field.type)),
    );
    const [next] = pending.splice(index === -1 ? 0 : index, 1);
    ordered.push(next);
    placed.add(next.name);
  }
  return ordered;
}

const delegate = (client, model) => client[model.name[0].toLowerCase() + model.name.slice(1)];

try {
  let mismatch = false;
  for (const model of inDependencyOrder(Prisma.dmmf.datamodel.models)) {
    const from = delegate(source, model);
    const to = delegate(target, model);
    if (!verifyOnly) {
      const key = model.fields.find((field) => field.isId)?.name ?? model.fields.find((field) => field.isUnique)?.name;
      for (let skip = 0; ; skip += BATCH) {
        const rows = await from.findMany({ skip, take: BATCH, ...(key ? { orderBy: { [key]: "asc" } } : {}) });
        if (!rows.length) break;
        await to.createMany({ data: rows, skipDuplicates: true });
        if (rows.length < BATCH) break;
      }
    }
    const [before, after] = await Promise.all([from.count(), to.count()]);
    if (after < before) mismatch = true;
    console.log(`[copy] ${model.name}: old=${before} new=${after}${after < before ? "  <-- MISSING ROWS" : ""}`);
  }
  if (mismatch) {
    console.error("[copy] The new database has fewer rows than the old one.");
    process.exitCode = 1;
  } else {
    console.log(verifyOnly ? "[copy] Row counts match." : "[copy] Done.");
  }
} catch (error) {
  // Never print the error object as-is: Prisma messages can include the URL.
  console.error("[copy] Failed:", String(error?.message ?? error).replace(/:\/\/[^@\s]*@/g, "://***@").slice(0, 600));
  process.exitCode = 1;
} finally {
  await Promise.all([source.$disconnect(), target.$disconnect()]);
}
