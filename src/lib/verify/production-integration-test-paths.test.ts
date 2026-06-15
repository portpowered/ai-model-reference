import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTION_INTEGRATION_TEST_PATHS } from "./production-integration-test-paths";

const repoRoot = join(import.meta.dir, "../../..");

const builtRouteConvergencePaths = [
  "src/tests/layout/grouped-query-attention-built-route-convergence.test.tsx",
  "src/tests/layout/linear-attention-built-route-convergence.test.tsx",
  "src/tests/layout/multi-head-latent-attention-built-route-convergence.test.tsx",
  "src/tests/layout/sliding-window-attention-built-route-convergence.test.tsx",
  "src/tests/layout/sparse-attention-built-route-convergence.test.tsx",
] as const;

const excludedScriptE2ePaths = [
  "src/lib/verify/phase-1-batch-013-convergence-validator.test.ts",
  "src/lib/verify/phase-1-built-app-convergence-validator.test.ts",
  "src/lib/verify/phase-1-follow-up-convergence-validator.test.ts",
  "src/lib/verify/phase-1-github-pages-convergence-validator.test.ts",
  "src/lib/verify/phase-1-github-pages-deploy-convergence-validator.test.ts",
  "src/lib/verify/phase-1-ux-verifier.test.ts",
] as const;

describe("PRODUCTION_INTEGRATION_TEST_PATHS", () => {
  test("lists only existing post-build integration test files", () => {
    expect(PRODUCTION_INTEGRATION_TEST_PATHS.length).toBeGreaterThan(0);
    for (const relativePath of PRODUCTION_INTEGRATION_TEST_PATHS) {
      expect(existsSync(join(repoRoot, relativePath))).toBe(true);
    }
  });

  test("excludes script-level E2E validator suites from the required CI path", () => {
    for (const relativePath of excludedScriptE2ePaths) {
      expect(PRODUCTION_INTEGRATION_TEST_PATHS).not.toContain(relativePath);
    }
  });

  test("includes all built-route convergence suites in the required CI path", () => {
    for (const relativePath of builtRouteConvergencePaths) {
      expect(PRODUCTION_INTEGRATION_TEST_PATHS).toContain(relativePath);
    }
  });

  test("includes built HTML and production-server convergence suites cited in governance", () => {
    expect(PRODUCTION_INTEGRATION_TEST_PATHS).toContain(
      "src/tests/layout/site-routes-shell.test.tsx",
    );
    expect(PRODUCTION_INTEGRATION_TEST_PATHS).toContain(
      "src/lib/verify/server-lifecycle.test.ts",
    );
  });
});
