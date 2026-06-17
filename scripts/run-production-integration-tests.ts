import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { PRODUCTION_INTEGRATION_TEST_PATHS } from "../src/lib/verify/production-integration-test-paths";
import { VERIFY_PRODUCTION_INTEGRATION_TESTS_ENV } from "../src/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "..");

const prepareResult = spawnSync("bun", ["run", "pretest"], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (prepareResult.status !== 0) {
  process.exit(prepareResult.status ?? 1);
}

const result = spawnSync(
  "bun",
  ["test", "--max-concurrency=1", ...PRODUCTION_INTEGRATION_TEST_PATHS],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      [VERIFY_PRODUCTION_INTEGRATION_TESTS_ENV]: "1",
    },
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
