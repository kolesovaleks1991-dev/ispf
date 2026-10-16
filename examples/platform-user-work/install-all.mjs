/**
 * Replay platform objects from this session on a local ISPF server.
 * Does not create JDBC data sources (configure cutoff separately).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoExamples = dirname(here);

function run(label, scriptPath, extraEnv = {}) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: dirname(scriptPath),
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status})`);
  }
}

run("Handler demo device", join(here, "install-handler-demo.mjs"));
run("Dashboard coordinates", join(here, "install-dashboard-coordinates.mjs"));
run("Mixin mix functions", join(repoExamples, "mix-blueprint/install-function.mjs"));
run("Device list query", join(repoExamples, "device-list-query/install.mjs"));
run("getFamilies on test1", join(repoExamples, "cutoff-common-families/install-function.mjs"));
run("SQL binding testBinding", join(repoExamples, "configure-testBinding.mjs"));

console.log("\nDone. Optional: node examples/cutoff/install.mjs (needs CUTOFF_DIR + PostgreSQL data source).");
