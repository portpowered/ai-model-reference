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
  createTableRegistrySourceEntries,
  renderGeneratedTableRegistryModule,
} from "@/lib/content/table-registry-generation";
import {
  captureGeneratedTableRegistryRootDriftEvidence,
  extractLoopedTransformersComparisonDiffHighlights,
  extractLoopedTransformersGeneratedLines,
  formatGeneratedTableRegistryReproducibilityProof,
  formatGeneratedTableRegistryRootDriftEvidence,
  GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
  GENERATED_TABLE_REGISTRY_DRIFT_EVIDENCE_PRESERVE_POLICY,
  GENERATED_TABLE_REGISTRY_ROOT_DRIFT_CLEANUP_PROOF_HEADER,
  LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
  LOOPED_TRANSFORMERS_COMPARISON_IMPORT_MARKER,
  LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH,
  proveGeneratedTableRegistryReproducibility,
  TABLE_REGISTRY_GENERATION_COMMAND,
  TABLE_REGISTRY_VALIDATION_COMMAND,
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

function createMockGitRunner(input: {
  originMainSha?: string;
  rootHeadSha?: string;
  presentPaths?: ReadonlySet<string>;
}): (
  repoRoot: string,
  args: readonly string[],
) => {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const originMainSha =
    input.originMainSha ?? "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const rootHeadSha =
    input.rootHeadSha ?? "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const presentPaths = input.presentPaths ?? new Set<string>();

  return (_repoRoot, args) => {
    if (args[0] === "rev-parse" && args[1] === "HEAD") {
      return { status: 0, stdout: `${rootHeadSha}\n`, stderr: "" };
    }
    if (args[0] === "rev-parse" && args[1] === "origin/main") {
      return { status: 0, stdout: `${originMainSha}\n`, stderr: "" };
    }
    if (args[0] === "rev-parse" && args[1] === "--git-common-dir") {
      return { status: 0, stdout: ".git\n", stderr: "" };
    }
    if (args[0] === "rev-list") {
      return { status: 0, stdout: "0\t0\n", stderr: "" };
    }
    if (args[0] === "cat-file" && args[1] === "-e") {
      const objectSpec = args[2];
      if (typeof objectSpec === "string" && presentPaths.has(objectSpec)) {
        return { status: 0, stdout: "", stderr: "" };
      }
      return { status: 1, stdout: "", stderr: "" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };
}

function createMinimalTableRecord(id: string, subjectId: string): string {
  return JSON.stringify({
    id,
    subjectId,
    columns: [
      {
        moduleId: subjectId,
        titleKey: `${id}.columns.primary`,
      },
    ],
    dimensions: [
      {
        id: "comparisonAxis",
        labelKey: `${id}.dimensions.primary`,
      },
    ],
    valueKeysByModuleId: {
      [subjectId]: {
        comparisonAxis: `${id}.values.primary`,
      },
    },
  });
}

describe("proveGeneratedTableRegistryReproducibility", () => {
  test("records matching deterministic generation when checkout artifact matches dry-run", () => {
    const generatedModuleSource = renderGeneratedTableRegistryModule(
      createTableRegistrySourceEntries([
        LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
        "alpha-comparison.json",
      ]),
    );
    const sourceTableRecord = createMinimalTableRecord(
      "table.looped-transformers-comparison",
      "module.looped-transformers",
    );
    const alphaTableRecord = createMinimalTableRecord(
      "table.alpha-comparison",
      "module.alpha",
    );
    const existingPaths = new Set([
      "/checkout/src/lib/content/generated/table-registry.generated.ts",
      `/checkout/${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
      "/checkout/src/content/registry/tables/alpha-comparison.json",
    ]);

    const proof = proveGeneratedTableRegistryReproducibility({
      checkoutRepoPath: "/checkout",
      generatedAtUtc: "2026-07-03T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      pathExists: (filePath) => existingPaths.has(filePath),
      runGit: createMockGitRunner({
        presentPaths: new Set([
          `origin/main:${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
          `HEAD:${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
        ]),
      }),
      readDir: (directoryPath) => {
        if (directoryPath.endsWith("/tables")) {
          return [
            LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
            "alpha-comparison.json",
          ];
        }
        return [];
      },
      readFile: (filePath) => {
        if (filePath.endsWith(LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME)) {
          return sourceTableRecord;
        }
        if (filePath.endsWith("alpha-comparison.json")) {
          return alphaTableRecord;
        }
        if (filePath.endsWith("table-registry.generated.ts")) {
          return generatedModuleSource;
        }
        throw new Error(`Unexpected read: ${filePath}`);
      },
    });

    expect(proof.generationCommand).toBe(TABLE_REGISTRY_GENERATION_COMMAND);
    expect(proof.validationCommand).toBe(TABLE_REGISTRY_VALIDATION_COMMAND);
    expect(proof.loopedTransformersSourceTablePresence.originMain).toBe(
      "present",
    );
    expect(proof.loopedTransformersSourceTablePresence.rootHead).toBe(
      "present",
    );
    expect(proof.loopedTransformersSourceTablePresence.checkoutFilesystem).toBe(
      "present",
    );
    expect(proof.reproducibilityOutcome).toBe(
      "matches-deterministic-generation",
    );
    expect(proof.currentGeneratedArtifactMatchesDryRun).toBe(true);
    expect(proof.loopedTransformersEntriesMatchDryRun).toBe(true);
    expect(proof.missingCanonicalSourceTableFiles).toEqual([]);
    expect(
      extractLoopedTransformersGeneratedLines(
        proof.dryRunGeneratedModuleSource,
      ),
    ).toEqual(extractLoopedTransformersGeneratedLines(generatedModuleSource));
  });

  test("flags stale drift when generated artifact references a missing canonical source table", () => {
    const generatedModuleSource = renderGeneratedTableRegistryModule(
      createTableRegistrySourceEntries([
        LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
      ]),
    );
    const existingPaths = new Set([
      "/checkout/src/lib/content/generated/table-registry.generated.ts",
    ]);

    const proof = proveGeneratedTableRegistryReproducibility({
      checkoutRepoPath: "/checkout",
      generatedAtUtc: "2026-07-03T04:01:00.000Z",
      remoteBaseRef: "origin/main",
      pathExists: (filePath) => existingPaths.has(filePath),
      runGit: createMockGitRunner({
        presentPaths: new Set([
          `origin/main:${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
        ]),
      }),
      readDir: () => [],
      readFile: (filePath) => {
        if (filePath.endsWith("table-registry.generated.ts")) {
          return generatedModuleSource;
        }
        throw new Error(`Unexpected read: ${filePath}`);
      },
    });

    expect(proof.reproducibilityOutcome).toBe("missing-canonical-source-table");
    expect(proof.missingCanonicalSourceTableFiles).toEqual([
      LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
    ]);
    expect(proof.loopedTransformersSourceTablePresence.checkoutFilesystem).toBe(
      "absent",
    );
    expect(proof.currentGeneratedArtifactMatchesDryRun).toBe(false);
    expect(proof.loopedTransformersEntriesMatchDryRun).toBe(false);
  });

  test("flags non-reproducible drift when generated artifact differs from dry-run output", () => {
    const dryRunModuleSource = renderGeneratedTableRegistryModule(
      createTableRegistrySourceEntries([
        LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
      ]),
    );
    const staleGeneratedModuleSource = `${dryRunModuleSource}\n// stale hand edit\n`;
    const sourceTableRecord = createMinimalTableRecord(
      "table.looped-transformers-comparison",
      "module.looped-transformers",
    );
    const existingPaths = new Set([
      "/checkout/src/lib/content/generated/table-registry.generated.ts",
      `/checkout/${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
    ]);

    const proof = proveGeneratedTableRegistryReproducibility({
      checkoutRepoPath: "/checkout",
      generatedAtUtc: "2026-07-03T04:02:00.000Z",
      remoteBaseRef: "origin/main",
      pathExists: (filePath) => existingPaths.has(filePath),
      runGit: createMockGitRunner({
        presentPaths: new Set([
          `origin/main:${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
          `HEAD:${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
        ]),
      }),
      readDir: () => [LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME],
      readFile: (filePath) => {
        if (filePath.endsWith(LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME)) {
          return sourceTableRecord;
        }
        if (filePath.endsWith("table-registry.generated.ts")) {
          return staleGeneratedModuleSource;
        }
        throw new Error(`Unexpected read: ${filePath}`);
      },
    });

    expect(proof.reproducibilityOutcome).toBe(
      "differs-from-deterministic-generation",
    );
    expect(proof.currentGeneratedArtifactMatchesDryRun).toBe(false);
    expect(proof.loopedTransformersEntriesMatchDryRun).toBe(true);
    expect(proof.missingCanonicalSourceTableFiles).toEqual([]);
  });

  test("formats reproducibility proof with generation and validation commands", () => {
    const generatedModuleSource = renderGeneratedTableRegistryModule(
      createTableRegistrySourceEntries([
        LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
      ]),
    );
    const sourceTableRecord = createMinimalTableRecord(
      "table.looped-transformers-comparison",
      "module.looped-transformers",
    );
    const existingPaths = new Set([
      "/checkout/src/lib/content/generated/table-registry.generated.ts",
      `/checkout/${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
    ]);

    const proof = proveGeneratedTableRegistryReproducibility({
      checkoutRepoPath: "/checkout",
      generatedAtUtc: "2026-07-03T04:03:00.000Z",
      remoteBaseRef: "origin/main",
      pathExists: (filePath) => existingPaths.has(filePath),
      runGit: createMockGitRunner({
        presentPaths: new Set([
          `origin/main:${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
          `HEAD:${LOOPED_TRANSFORMERS_COMPARISON_SOURCE_TABLE_PATH}`,
        ]),
      }),
      readDir: () => [LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME],
      readFile: (filePath) => {
        if (filePath.endsWith(LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME)) {
          return sourceTableRecord;
        }
        if (filePath.endsWith("table-registry.generated.ts")) {
          return generatedModuleSource;
        }
        throw new Error(`Unexpected read: ${filePath}`);
      },
    });

    const text = formatGeneratedTableRegistryReproducibilityProof(proof);

    expect(text).toContain("Reproducibility");
    expect(text).toContain(
      `generation-command=${TABLE_REGISTRY_GENERATION_COMMAND}`,
    );
    expect(text).toContain(
      `validation-command=${TABLE_REGISTRY_VALIDATION_COMMAND}`,
    );
    expect(text).toContain(
      "looped-transformers-present-on-origin-main=present",
    );
    expect(text).toContain(
      "reproducibility-outcome=matches-deterministic-generation",
    );
    expect(text).toContain(LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME);
  });
});

describe("reproducibility report script integration", () => {
  test("emits reproducibility proof without mutating git state", () => {
    const dir = mkdtempSync(
      join(tmpdir(), "generated-table-registry-root-drift-repro-"),
    );
    const repoRoot = join(dir, "repo");
    const tablesDir = join(repoRoot, "src/content/registry/tables");
    const artifactPath = join(repoRoot, GENERATED_TABLE_REGISTRY_ARTIFACT_PATH);
    const sourceTablePath = join(
      tablesDir,
      LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
    );

    mkdirSync(tablesDir, { recursive: true });
    writeFileSync(
      sourceTablePath,
      createMinimalTableRecord(
        "table.looped-transformers-comparison",
        "module.looped-transformers",
      ),
    );

    const generatedModuleSource = renderGeneratedTableRegistryModule(
      createTableRegistrySourceEntries([
        LOOPED_TRANSFORMERS_COMPARISON_FILE_NAME,
      ]),
    );
    mkdirSync(join(artifactPath, ".."), { recursive: true });
    writeFileSync(artifactPath, generatedModuleSource);

    runGit(repoRoot, ["init", "-b", "main"]);
    runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
    runGit(repoRoot, ["config", "user.name", "Planner Tests"]);
    runGit(repoRoot, ["add", "."]);
    runGit(repoRoot, ["commit", "-m", "initial"]);
    runGit(repoRoot, ["branch", "origin-main"]);
    runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "origin-main"]);

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
        "--reproducibility",
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Reproducibility");
    expect(result.stdout).toContain(
      "reproducibility-outcome=matches-deterministic-generation",
    );
    expect(result.stdout).toContain(
      `generation-command=${TABLE_REGISTRY_GENERATION_COMMAND}`,
    );

    const statusAfter = spawnSync("git", ["status", "--porcelain"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).stdout;
    expect(statusAfter).toBe(statusBefore);

    rmSync(dir, { recursive: true, force: true });
  });
});
