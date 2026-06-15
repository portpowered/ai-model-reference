import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  getExportIntegrationBunTestTimeoutMs,
  isInsideExportIntegrationProbeLock,
  removeExportIntegrationProbeLockForTests,
  shouldRunExportIntegrationProbeTests,
  shouldRunPhase1ExportSearchUxServedProbe,
  shouldRunPlaywrightHttpVerifierUnitTests,
  shouldRunServedPhase1CanonicalQueriesProbe,
  shouldSerializeExportIntegrationProbes,
  withExportIntegrationProbeLock,
} from "./export-integration-probe-lock";
import { VERIFY_COVERAGE_SUBPROCESS_ENV } from "./server-lifecycle";

describe("export integration probe lock", () => {
  const originalCi = process.env.CI;
  const originalGithubActions = process.env.GITHUB_ACTIONS;

  beforeEach(() => {
    removeExportIntegrationProbeLockForTests();
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
  });

  afterEach(() => {
    removeExportIntegrationProbeLockForTests();
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
    expect(getExportIntegrationBunTestTimeoutMs()).toBe(3_600_000);

    process.env[VERIFY_COVERAGE_SUBPROCESS_ENV] = "1";
    try {
      expect(getExportIntegrationBunTestTimeoutMs()).toBe(300_000);
    } finally {
      delete process.env[VERIFY_COVERAGE_SUBPROCESS_ENV];
    }
  });

  test("skips export integration probes during the coverage subprocess rerun", () => {
    expect(
      shouldRunExportIntegrationProbeTests({
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
    expect(shouldRunExportIntegrationProbeTests({})).toBe(true);
  });

  test("skips Playwright HTTP verifier unit tests during the coverage subprocess rerun", () => {
    expect(
      shouldRunPlaywrightHttpVerifierUnitTests({
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
    expect(shouldRunPlaywrightHttpVerifierUnitTests({})).toBe(true);
  });

  test("skips served Phase 1 canonical query probe under probe serialization", () => {
    expect(shouldRunServedPhase1CanonicalQueriesProbe({})).toBe(false);
    expect(shouldRunServedPhase1CanonicalQueriesProbe({ CI: "true" })).toBe(
      false,
    );
    expect(
      shouldRunServedPhase1CanonicalQueriesProbe({
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
  });

  test("skips served Phase 1 export search UX probe under probe serialization", () => {
    expect(shouldRunPhase1ExportSearchUxServedProbe({})).toBe(false);
    expect(shouldRunPhase1ExportSearchUxServedProbe({ CI: "true" })).toBe(
      false,
    );
    expect(
      shouldRunPhase1ExportSearchUxServedProbe({
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
  });

  test("detects probe serialization flags", () => {
    expect(shouldSerializeExportIntegrationProbes({})).toBe(true);
    expect(shouldSerializeExportIntegrationProbes({ CI: "true" })).toBe(true);
    expect(
      shouldSerializeExportIntegrationProbes({ GITHUB_ACTIONS: "true" }),
    ).toBe(true);
    expect(
      shouldSerializeExportIntegrationProbes({
        [VERIFY_COVERAGE_SUBPROCESS_ENV]: "1",
      }),
    ).toBe(false);
  });

  test("serializes probes outside the coverage subprocess rerun", async () => {
    expect(shouldSerializeExportIntegrationProbes({})).toBe(true);

    const value = await withExportIntegrationProbeLock(async () => "ok");
    expect(value).toBe("ok");
    expect(isInsideExportIntegrationProbeLock()).toBe(false);
  });

  test.serial(
    "tracks export probe lock depth for nested launch serialization",
    async () => {
      expect(isInsideExportIntegrationProbeLock()).toBe(false);
      await withExportIntegrationProbeLock(async () => {
        expect(isInsideExportIntegrationProbeLock()).toBe(true);
      });
      expect(isInsideExportIntegrationProbeLock()).toBe(false);
    },
  );
});
