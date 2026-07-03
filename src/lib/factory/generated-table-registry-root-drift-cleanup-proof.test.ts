import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureGeneratedTableRegistryRootDriftEvidence,
  extractLoopedTransformersComparisonDiffHighlights,
  formatGeneratedTableRegistryRootDriftEvidence,
  GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
  GENERATED_TABLE_REGISTRY_DRIFT_EVIDENCE_PRESERVE_POLICY,
  GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER,
  LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
  LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER,
} from "@/lib/factory/generated-table-registry-root-drift-cleanup-proof";

const FIXTURE_DIR = join(
  import.meta.dir,
  "../../tests/fixtures/generated-table-registry-root-drift-cleanup-proof",
);

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8");
}

function runGit(repoRoot: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
}

describe("extractLoopedTransformersComparisonDiffHighlights", () => {
  test("identifies import, source, and payload additions in a diff", () => {
    const diff = [
      `--- a/${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`,
      `+++ b/${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`,
      `@@ -20,6 +20,7 @@`,
      `+import ${LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER} from "@/content/registry/tables/${LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME}";`,
      `+  "${LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME}",`,
      `+  ${LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER},`,
    ].join("\n");

    const highlights = extractLoopedTransformersComparisonDiffHighlights(diff);

    expect(highlights.importLinePresent).toBe(true);
    expect(highlights.sourceEntryPresent).toBe(true);
    expect(highlights.payloadEntryPresent).toBe(true);
    expect(highlights.addedDiffHunks).toHaveLength(3);
    expect(highlights.removedDiffHunks).toHaveLength(0);
  });
});

describe("captureGeneratedTableRegistryRootDriftEvidence", () => {
  test("captures aligned clean root checkout evidence without looped-transformers diff", () => {
    const report = captureGeneratedTableRegistryRootDriftEvidence({
      generatedAtUtc: "2026-07-03T03:30:00.000Z",
      repoRoot: "/repo/root",
      remoteBaseRef: "origin/main",
      statusOutput: "## main...origin/main\n",
      diffOutput: "",
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse" && args[1] === "HEAD") {
          return {
            status: 0,
            stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
            stderr: "",
          };
        }
        if (args[0] === "rev-parse" && args[1] === "origin/main") {
          return {
            status: 0,
            stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
            stderr: "",
          };
        }
        if (args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { status: 0, stdout: ".git\n", stderr: "" };
        }
        if (args[0] === "rev-list") {
          return { status: 0, stdout: "0\t0\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    expect(report.rootHeadSha).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(report.originMainSha).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(report.commitsAheadOfRemote).toBe(0);
    expect(report.commitsBehindRemote).toBe(0);
    expect(report.generatedArtifactCleanliness).toBe("clean");
    expect(report.generatedArtifactStatusLine).toBeNull();
    expect(
      report.loopedTransformersComparisonDiffHighlights.addedDiffHunks,
    ).toHaveLength(0);
    expect(report.preservePolicy).toBe(
      GENERATED_TABLE_REGISTRY_DRIFT_EVIDENCE_PRESERVE_POLICY,
    );
  });

  test("captures dirty generated artifact status and looped-transformers diff highlights", () => {
    const diffOutput = readFixture("looped-transformers-table-registry.diff");
    const statusOutput = readFixture("dirty-table-registry-status.txt");

    const report = captureGeneratedTableRegistryRootDriftEvidence({
      generatedAtUtc: "2026-07-03T03:31:00.000Z",
      repoRoot: "/repo/root",
      remoteBaseRef: "origin/main",
      statusOutput,
      diffOutput,
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse" && args[1] === "HEAD") {
          return {
            status: 0,
            stdout: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
            stderr: "",
          };
        }
        if (args[0] === "rev-parse" && args[1] === "origin/main") {
          return {
            status: 0,
            stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
            stderr: "",
          };
        }
        if (args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { status: 0, stdout: ".git\n", stderr: "" };
        }
        if (args[0] === "rev-list") {
          return { status: 0, stdout: "9\t0\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    expect(report.commitsBehindRemote).toBe(9);
    expect(report.generatedArtifactCleanliness).toBe("dirty");
    expect(report.generatedArtifactStatusLine).toBe(
      ` M ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`,
    );
    expect(
      report.loopedTransformersComparisonDiffHighlights.importLinePresent,
    ).toBe(true);
    expect(
      report.loopedTransformersComparisonDiffHighlights.sourceEntryPresent,
    ).toBe(true);
    expect(
      report.loopedTransformersComparisonDiffHighlights.payloadEntryPresent,
    ).toBe(true);
    expect(
      report.loopedTransformersComparisonDiffHighlights.addedDiffHunks.length,
    ).toBeGreaterThan(0);
  });

  test("formats text output with branch status and diff sections", () => {
    const report = captureGeneratedTableRegistryRootDriftEvidence({
      generatedAtUtc: "2026-07-03T03:32:00.000Z",
      repoRoot: "/repo/root",
      remoteBaseRef: "origin/main",
      statusOutput: readFixture("dirty-table-registry-status.txt"),
      diffOutput: readFixture("looped-transformers-table-registry.diff"),
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse" && args[1] === "HEAD") {
          return {
            status: 0,
            stdout: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
            stderr: "",
          };
        }
        if (args[0] === "rev-parse" && args[1] === "origin/main") {
          return {
            status: 0,
            stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
            stderr: "",
          };
        }
        if (args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { status: 0, stdout: ".git\n", stderr: "" };
        }
        if (args[0] === "rev-list") {
          return { status: 0, stdout: "9\t0\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const text = formatGeneratedTableRegistryRootDriftEvidence(report);

    expect(text).toContain(
      GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER,
    );
    expect(text).toContain("commits-behind=9");
    expect(text).toContain(
      `generated-artifact-path=${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`,
    );
    expect(text).toContain("generated-artifact-cleanliness=dirty");
    expect(text).toContain(
      "looped-transformers-comparison-import-present=true",
    );
    expect(text).toContain(
      "looped-transformers-comparison-source-present=true",
    );
    expect(text).toContain(
      "looped-transformers-comparison-payload-present=true",
    );
    expect(text).toContain("generated-artifact-diff:");
    expect(text).toContain(LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME);
  });
});

describe("report script integration", () => {
  test("reads fixture status output without mutating git state", () => {
    const dir = mkdtempSync(
      join(tmpdir(), "generated-table-registry-root-drift-proof-"),
    );
    const repoRoot = join(dir, "repo");
    const artifactPath = join(repoRoot, GENERATED_TABLE_REGISTRY_ARTIFACT_PATH);

    mkdirSync(join(artifactPath, ".."), { recursive: true });
    writeFileSync(
      artifactPath,
      "// generated baseline without looped-transformers\n",
    );

    runGit(repoRoot, ["init", "-b", "main"]);
    runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
    runGit(repoRoot, ["config", "user.name", "Planner Tests"]);
    runGit(repoRoot, ["add", "."]);
    runGit(repoRoot, ["commit", "-m", "initial"]);
    runGit(repoRoot, ["branch", "origin-main"]);
    runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "origin-main"]);

    writeFileSync(
      artifactPath,
      [
        `import ${LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER} from "@/content/registry/tables/${LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME}";`,
        `export const generatedTableRegistrySourceFiles = ["${LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME}"];`,
        `export const generatedTableRegistryPayloads = [${LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER}];`,
      ].join("\n"),
    );

    const statusBefore = spawnSync("git", ["status", "--porcelain"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).stdout;

    const result = spawnSync(
      "bun",
      [
        "./scripts/report-generated-table-registry-root-drift-cleanup-proof.ts",
        "--repo-root",
        repoRoot,
        "--remote-base-ref",
        "origin/main",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER,
    );
    expect(result.stdout).toContain("generated-artifact-cleanliness=dirty");
    expect(result.stdout).toContain(
      "looped-transformers-comparison-import-present=true",
    );
    expect(result.stdout).toContain(
      GENERATED_TABLE_REGISTRY_DRIFT_EVIDENCE_PRESERVE_POLICY,
    );

    const statusAfter = spawnSync("git", ["status", "--porcelain"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).stdout;
    expect(statusAfter).toBe(statusBefore);

    rmSync(dir, { recursive: true, force: true });
  });
});
