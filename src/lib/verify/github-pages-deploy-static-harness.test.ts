import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { httpGetText } from "./http-harness";
import {
  acquireStaticExportVerifySession,
  buildDeployConvergenceVerifyEnv,
  DEPLOY_PATH_VERIFY_BASE_URL_UNCERTAIN_REASON,
  resolveDeployStaticHarnessBasePath,
} from "./phase-1-github-pages-deploy-static-harness";
import { CANONICAL_GITHUB_PAGES_BASE_PATH } from "./phase-1-github-pages-deploy-workflow";
import { VERIFY_BASE_URL_ENV } from "./server-lifecycle";

function writeOutFixture(rootDir: string): void {
  writeFileSync(
    join(rootDir, "index.html"),
    "<html>deploy-harness-home</html>",
  );
}

describe("resolveDeployStaticHarnessBasePath", () => {
  test("returns the canonical GitHub Pages project-site prefix", () => {
    expect(resolveDeployStaticHarnessBasePath()).toBe(
      `/${CANONICAL_GITHUB_PAGES_BASE_PATH}`,
    );
  });
});

describe("buildDeployConvergenceVerifyEnv", () => {
  test("unsets VERIFY_BASE_URL for canonical default spawn path", () => {
    const env = buildDeployConvergenceVerifyEnv({
      ...process.env,
      VERIFY_BASE_URL: "http://127.0.0.1:3999",
      PATH: "/usr/bin",
    });

    expect(env.VERIFY_BASE_URL).toBeUndefined();
    expect(env.PATH).toBe("/usr/bin");
  });
});

describe("acquireStaticExportVerifySession", () => {
  test("returns pass after readiness polling with canonical base path", async () => {
    const root = mkdtempSync(join(tmpdir(), "deploy-static-harness-pass-"));
    writeOutFixture(root);

    const outcome = await acquireStaticExportVerifySession({
      outDir: root,
      port: 3194,
    });

    expect(outcome.status).toBe("pass");
    if (outcome.status !== "pass") {
      return;
    }

    expect(outcome.usedExternalVerifyBaseUrl).toBe(false);
    expect(outcome.baseUrl).toBe(
      `http://127.0.0.1:3194/${CANONICAL_GITHUB_PAGES_BASE_PATH}`,
    );

    const home = await httpGetText(`${outcome.baseUrl}/`);
    expect(home.status).toBe(200);
    expect(home.body).toContain("deploy-harness-home");

    await outcome.session.cleanup();
    rmSync(root, { recursive: true, force: true });
  });

  test("fails with lifecycle reason when out/ is missing", async () => {
    const missingDir = join(
      tmpdir(),
      `deploy-static-harness-missing-${Date.now()}`,
    );
    const outcome = await acquireStaticExportVerifySession({
      outDir: missingDir,
    });

    expect(outcome.status).toBe("fail");
    if (outcome.status === "fail") {
      expect(outcome.reason).toContain("Missing export directory");
      expect(outcome.reason).toContain(missingDir);
    }
  });

  test("fails on readiness timeout when index.html is absent", async () => {
    const root = mkdtempSync(join(tmpdir(), "deploy-static-harness-timeout-"));
    mkdirSync(root, { recursive: true });

    const outcome = await acquireStaticExportVerifySession({
      outDir: root,
      port: 3195,
      startupTimeoutMs: 200,
    });

    expect(outcome.status).toBe("fail");
    if (outcome.status === "fail") {
      expect(outcome.reason).toMatch(/did not become ready|Expected HTTP 200/i);
    }

    rmSync(root, { recursive: true, force: true });
  });

  test("returns uncertain when VERIFY_BASE_URL is set in the environment", async () => {
    const outcome = await acquireStaticExportVerifySession({
      env: {
        [VERIFY_BASE_URL_ENV]: "http://127.0.0.1:3998///",
      },
    });

    expect(outcome.status).toBe("uncertain");
    if (outcome.status !== "uncertain") {
      return;
    }

    expect(outcome.usedExternalVerifyBaseUrl).toBe(true);
    expect(outcome.baseUrl).toBe("http://127.0.0.1:3998");
    expect(outcome.reason).toBe(DEPLOY_PATH_VERIFY_BASE_URL_UNCERTAIN_REASON);
    await outcome.session.cleanup();
  });

  test("cleanup stops serving responses after teardown", async () => {
    const root = mkdtempSync(join(tmpdir(), "deploy-static-harness-teardown-"));
    writeOutFixture(root);

    const outcome = await acquireStaticExportVerifySession({
      outDir: root,
      port: 3196,
    });

    expect(outcome.status).toBe("pass");
    if (outcome.status !== "pass") {
      return;
    }

    const port = 3196;
    await outcome.session.cleanup();

    await expect(httpGetText(`http://127.0.0.1:${port}/`)).rejects.toThrow();

    rmSync(root, { recursive: true, force: true });
  });
});
