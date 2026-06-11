import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  computeBuildSourceFingerprint,
  isNextProductionBuildFresh,
  readBuildSourceFingerprint,
  writeBuildSourceFingerprint,
} from "./build-source-fingerprint";

describe("build source fingerprint", () => {
  let projectRoot = "";

  afterEach(() => {
    if (projectRoot) {
      rmSync(projectRoot, { recursive: true, force: true });
      projectRoot = "";
    }
  });

  test("treats builds without a fingerprint stamp as stale", () => {
    projectRoot = mkdtempSync(join(tmpdir(), "build-fingerprint-missing-"));
    mkdirSync(join(projectRoot, ".next"), { recursive: true });
    writeFileSync(join(projectRoot, ".next", "BUILD_ID"), "test-build");

    expect(readBuildSourceFingerprint(projectRoot)).toBeNull();
    expect(isNextProductionBuildFresh(projectRoot)).toBe(false);
  });

  test("accepts a build when the stored fingerprint matches the current source snapshot", () => {
    projectRoot = mkdtempSync(join(tmpdir(), "build-fingerprint-match-"));
    mkdirSync(join(projectRoot, ".next"), { recursive: true });
    writeFileSync(join(projectRoot, "package.json"), '{"name":"fixture"}');
    writeFileSync(join(projectRoot, "bun.lock"), "lock");

    const fingerprint = computeBuildSourceFingerprint(projectRoot);
    writeBuildSourceFingerprint(projectRoot, fingerprint);

    expect(isNextProductionBuildFresh(projectRoot)).toBe(true);
  });

  test("rejects a build when the stored fingerprint is from a different source snapshot", () => {
    projectRoot = mkdtempSync(join(tmpdir(), "build-fingerprint-stale-"));
    mkdirSync(join(projectRoot, ".next"), { recursive: true });
    writeFileSync(join(projectRoot, "package.json"), '{"name":"fixture"}');
    writeFileSync(join(projectRoot, "bun.lock"), "lock");
    writeBuildSourceFingerprint(projectRoot, "stale:fingerprint:stamp:values");

    expect(isNextProductionBuildFresh(projectRoot)).toBe(false);
  });
});
