import { execFileSync } from "node:child_process";

const [baseSha, headSha = "HEAD"] = process.argv.slice(2);

if (!baseSha || /^0+$/.test(baseSha)) {
  console.log("[migrations] no base commit available; skipping immutability check");
  process.exit(0);
}

const diff = execFileSync(
  "git",
  ["diff", "--name-status", "--find-renames", baseSha, headSha, "--", "prisma/migrations"],
  { encoding: "utf8" },
).trim();

if (!diff) {
  console.log("[migrations] no migration changes detected");
  process.exit(0);
}

const changedSharedMigrations = diff
  .split("\n")
  .filter((line) => !line.startsWith("A\t"));

if (changedSharedMigrations.length > 0) {
  console.error("[migrations] applied migrations are immutable:");
  for (const line of changedSharedMigrations) console.error(`  ${line}`);
  console.error("Create a new migration for the correction instead.");
  process.exit(1);
}

console.log("[migrations] only new migration files were added");
