import { afterEach, describe, expect, test } from "bun:test";
import {
  getExportIntegrationBunTestTimeoutMs,
  isInsideExportIntegrationProbeLock,
  shouldRunExportIntegrationProbeTests,
  shouldRunServedPhase1CanonicalQueriesProbe,
  shouldSerializeExportIntegrationProbes,
  withExportIntegrationProbeLock,
} from "./export-integration-probe-lock";
import { VERIFY_COVERAGE_SUBPROCESS_ENV } from "./server-lifecycle";

describe("export integration probe lock", () => {
  const originalCi = process.env.CI;
  const originalGithubActions = process.env.GITHUB_ACTIONS;

  afterEach(() => {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
    if (originalGithubActions === undefined) {
      delete process.env.GITHUB_ACTIONS;
    } else {
      process.env.GITHUB_ACTIONS = originalGithubActions;
    }
  });

  test("resolves export integration Bun ceilings from current env", () => {
    process.env.CI = "true";
    expect(getExportIntegrationBunTestTimeoutMs()).toBe(3_600_000);

    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    expect(getExportIntegrationBunTestTimeoutMs()).toBe(300_000);
  });

  test("skips export integration probes during the coverage subprocess rerun", () => {
    expect(
      shouldRunExportIntegrationProbeTests({
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
    expect(shouldRunExportIntegrationProbeTests({})).toBe(true);
  });

  test("skips served Phase 1 canonical query probe under CI serialization", () => {
    expect(shouldRunServedPhase1CanonicalQueriesProbe({ CI: "true" })).toBe(
      false,
    );
    expect(
      shouldRunServedPhase1CanonicalQueriesProbe({
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
    expect(shouldRunServedPhase1CanonicalQueriesProbe({})).toBe(true);
  });

  test("detects CI serialization flags", () => {
    process.env.CI = "true";
    expect(shouldSerializeExportIntegrationProbes()).toBe(true);

    delete process.env.CI;
    process.env.GITHUB_ACTIONS = "true";
    expect(shouldSerializeExportIntegrationProbes()).toBe(true);

    delete process.env.GITHUB_ACTIONS;
    expect(shouldSerializeExportIntegrationProbes()).toBe(false);
  });

  test("runs probes without serialization outside CI", async () => {
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    expect(shouldSerializeExportIntegrationProbes()).toBe(false);

    const value = await withExportIntegrationProbeLock(async () => "ok");
    expect(value).toBe("ok");
    expect(isInsideExportIntegrationProbeLock()).toBe(false);
  });

  test("tracks export probe lock depth for nested launch serialization", async () => {
    expect(isInsideExportIntegrationProbeLock()).toBe(false);
    await withExportIntegrationProbeLock(async () => {
      expect(isInsideExportIntegrationProbeLock()).toBe(true);
    });
    expect(isInsideExportIntegrationProbeLock()).toBe(false);
  });
});
