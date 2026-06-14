import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  computeProductionIntegrationSourceDigest,
  hasTrustedProductionBuildArtifact,
  PRODUCTION_INTEGRATION_BUILD_DIGEST_FILENAME,
  readStoredProductionIntegrationBuildDigest,
  VERIFY_FORCE_PRODUCTION_INTEGRATION_ENV,
  writeProductionIntegrationBuildDigest,
} from "./production-integration-build-trust";

describe("production integration build trust", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function createFixtureRoot(): string {
    const projectRoot = mkdtempSync(join(tmpdir(), "verify-build-trust-"));
    tempRoots.push(projectRoot);
    mkdirSync(join(projectRoot, "src"), { recursive: true });
    writeFileSync(join(projectRoot, "package.json"), '{"name":"fixture"}\n');
    writeFileSync(join(projectRoot, "src", "app.ts"), "export {};\n");
    mkdirSync(join(projectRoot, ".next"), { recursive: true });
    writeFileSync(join(projectRoot, ".next", "BUILD_ID"), "fixture-build");
    return projectRoot;
  }

  test("hasTrustedProductionBuildArtifact is false without a stored digest", () => {
    const projectRoot = createFixtureRoot();
    expect(hasTrustedProductionBuildArtifact(projectRoot)).toBe(false);
  });

  test("writeProductionIntegrationBuildDigest stores a digest that matches current sources", () => {
    const projectRoot = createFixtureRoot();
    const digest = writeProductionIntegrationBuildDigest(projectRoot);

    expect(readStoredProductionIntegrationBuildDigest(projectRoot)).toBe(
      digest,
    );
    expect(hasTrustedProductionBuildArtifact(projectRoot)).toBe(true);
  });

  test("hasTrustedProductionBuildArtifact is false when sources change after build", () => {
    const projectRoot = createFixtureRoot();
    writeProductionIntegrationBuildDigest(projectRoot);

    writeFileSync(
      join(projectRoot, "src", "changed.ts"),
      "export const x = 1;\n",
    );

    expect(hasTrustedProductionBuildArtifact(projectRoot)).toBe(false);
  });

  test("VERIFY_FORCE_PRODUCTION_INTEGRATION bypasses digest matching", () => {
    const projectRoot = createFixtureRoot();
    expect(
      hasTrustedProductionBuildArtifact(projectRoot, {
        [VERIFY_FORCE_PRODUCTION_INTEGRATION_ENV]: "1",
      }),
    ).toBe(true);
  });

  test("computeProductionIntegrationSourceDigest is stable for unchanged fixtures", () => {
    const projectRoot = createFixtureRoot();
    const first = computeProductionIntegrationSourceDigest(projectRoot);
    const second = computeProductionIntegrationSourceDigest(projectRoot);
    expect(second).toBe(first);
  });

  test("stored digest path uses the production integration filename", () => {
    const projectRoot = createFixtureRoot();
    writeProductionIntegrationBuildDigest(projectRoot);
    expect(
      readStoredProductionIntegrationBuildDigest(projectRoot),
    ).toBeTruthy();
    expect(PRODUCTION_INTEGRATION_BUILD_DIGEST_FILENAME).toBe(
      "verify-production-integration-build-digest",
    );
  });
});
