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
  buildOwnerlessGeneratedTableRegistryDriftClassificationReport,
  buildOwnerlessGeneratedTableRegistryDriftPlannerReport,
  buildTableRegistryRegenerationProof,
  captureGeneratedTableRegistryArtifactEvidence,
  captureOwnerlessGeneratedTableRegistryDriftEvidence,
  captureRootGitTruthEvidence,
  classifyGeneratedTableRegistryArtifactStatus,
  classifyLoopedTransformersComparisonEntryObservation,
  detectTableEntryPresenceInModuleSource,
  extractTableEntryDiffLines,
  formatOwnerlessGeneratedTableRegistryDriftEvidenceReport,
  formatOwnerlessGeneratedTableRegistryDriftUnifiedReport,
  GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
  type GeneratedTableRegistryLaneOwnershipEvidence,
  loadTableRegistrySourceCatalog,
  OBSERVED_TABLE_ENTRY_FILE_NAME,
  OBSERVED_TABLE_ENTRY_ID,
  OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_CLASSIFICATION_HEADER,
  OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_HEADER,
  OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_NEXT_ACTION_HEADER,
  OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_PRESERVE_POLICY,
  type OwnerlessGeneratedTableRegistryDriftEvidenceReport,
  renderExpectedTableRegistryModuleSource,
  resolveGeneratedTableRegistryArtifactNextAction,
  serializeOwnerlessGeneratedTableRegistryDriftEvidenceReport,
  type TableRegistrySourceCatalog,
} from "@/lib/factory/ownerless-generated-table-registry-drift";

const TABLE_REGISTRY_ARTIFACT_DIRTY_STATUS_FIXTURE = readFileSync(
  join(
    import.meta.dir,
    "../../tests/fixtures/ownerless-generated-table-registry-drift/table-registry-artifact-dirty-status.txt",
  ),
  "utf8",
);

const TABLE_REGISTRY_ARTIFACT_ADDED_ENTRY_DIFF_FIXTURE = readFileSync(
  join(
    import.meta.dir,
    "../../tests/fixtures/ownerless-generated-table-registry-drift/table-registry-artifact-added-entry.diff",
  ),
  "utf8",
);

const MUTATING_GIT_COMMANDS = new Set([
  "add",
  "checkout",
  "clean",
  "commit",
  "merge",
  "pull",
  "push",
  "rebase",
  "reset",
  "restore",
  "revert",
  "rm",
  "stash",
  "update-index",
  "update-ref",
  "write-tree",
]);

function runGit(repoRoot: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
}

function createFixtureRepo(): {
  artifactPath: string;
  cleanup: () => void;
  mainRef: string;
  repoRoot: string;
} {
  const dir = mkdtempSync(
    join(tmpdir(), "ownerless-generated-table-registry-drift-"),
  );
  const repoRoot = join(dir, "repo");
  const artifactPath = GENERATED_TABLE_REGISTRY_ARTIFACT_PATH;
  mkdirSync(repoRoot, { recursive: true });

  runGit(repoRoot, ["init", "-b", "main"]);
  runGit(repoRoot, ["config", "user.email", "planner-tests@example.com"]);
  runGit(repoRoot, ["config", "user.name", "Planner Tests"]);

  const artifactAbsolutePath = join(repoRoot, artifactPath);
  mkdirSync(join(artifactAbsolutePath, ".."), { recursive: true });
  writeFileSync(
    artifactAbsolutePath,
    `// generated
export const generatedTableRegistrySourceFiles = [] as const;
export const generatedTableRegistryPayloads = [] as const;
`,
  );

  runGit(repoRoot, ["add", "."]);
  runGit(repoRoot, ["commit", "-m", "initial"]);
  runGit(repoRoot, ["branch", "origin-main"]);
  runGit(repoRoot, ["update-ref", "refs/remotes/origin/main", "origin-main"]);

  writeFileSync(
    artifactAbsolutePath,
    `// generated
import loopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison.json";
export const generatedTableRegistrySourceFiles = [
  "${OBSERVED_TABLE_ENTRY_FILE_NAME}",
] as const;
export const generatedTableRegistryPayloads = [
  loopedTransformersComparisonTableRecord,
] as const;
`,
  );

  return {
    artifactPath,
    cleanup: () => rmSync(dir, { force: true, recursive: true }),
    mainRef: "origin/main",
    repoRoot,
  };
}

function createExpectedModuleSourceForTableEntry(
  tableEntryFileName: string,
): string {
  return renderGeneratedTableRegistryModule(
    createTableRegistrySourceEntries([tableEntryFileName]),
  );
}

function createEvidenceReport(input: {
  dirtyStatus: "clean" | "dirty";
  headSource: string;
  observationKind?:
    | "present-in-worktree"
    | "added-in-diff"
    | "removed-in-diff"
    | "modified-in-diff";
  repoRoot?: string;
  statusLine?: string | null;
  worktreeSource: string;
}): OwnerlessGeneratedTableRegistryDriftEvidenceReport {
  const observationKind = input.observationKind ?? "present-in-worktree";
  return {
    capturePolicy: OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_PRESERVE_POLICY,
    generatedArtifact: {
      artifactPath: GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
      diffExcerpt: input.dirtyStatus === "dirty" ? "+added" : null,
      dirtyStatus: input.dirtyStatus,
      statusCode: input.dirtyStatus === "dirty" ? " M" : null,
      statusLine:
        input.statusLine ??
        (input.dirtyStatus === "dirty"
          ? ` M ${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`
          : null),
      loopedTransformersComparisonEntry: {
        importStatementPresentOnHead:
          observationKind !== "added-in-diff" &&
          observationKind !== "removed-in-diff",
        importStatementPresentInWorktree: observationKind !== "removed-in-diff",
        kind: observationKind,
        observedDiffLines:
          observationKind === "added-in-diff" ? ["+added"] : [],
        payloadEntryPresentOnHead:
          observationKind !== "added-in-diff" &&
          observationKind !== "removed-in-diff",
        payloadEntryPresentInWorktree: observationKind !== "removed-in-diff",
        sourceFileListEntryPresentOnHead:
          observationKind !== "added-in-diff" &&
          observationKind !== "removed-in-diff",
        sourceFileListEntryPresentInWorktree:
          observationKind !== "removed-in-diff",
        tableEntryFileName: OBSERVED_TABLE_ENTRY_FILE_NAME,
        tableEntryId: OBSERVED_TABLE_ENTRY_ID,
      },
    },
    generatedAtUtc: "2026-07-03T05:00:00.000Z",
    rootGitTruth: {
      commitsAheadOfRemote: 0,
      commitsBehindRemote: 19,
      headSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      headShortSha: "aaaaaaa",
      remoteBaseRef: "origin/main",
      remoteMainSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      remoteMainShortSha: "bbbbbbb",
      remoteRelationship: "behind",
      repoRoot: input.repoRoot ?? "/tmp/root-repo",
    },
  };
}

function createSourceCatalog(
  tableEntryFileName: string,
  extraFileNames: string[] = [],
): TableRegistrySourceCatalog {
  const sourceFileNames = [...extraFileNames, tableEntryFileName].sort(
    (left, right) => left.localeCompare(right),
  );
  return {
    canonicalSourceFilePresent: true,
    sourceFileNames,
    tablesRegistryRoot: "/tmp/root-repo/src/content/registry/tables",
  };
}

function createLaneOwnership(
  laneName: string,
): GeneratedTableRegistryLaneOwnershipEvidence {
  return {
    branchName: `${laneName}-branch`,
    laneName,
    ownershipKind: "worktree-owned",
    reason: `Dirty path was observed directly in active lane ${laneName}.`,
    reasonCode: "direct-worktree-match",
  };
}

describe("ownerless-generated-table-registry-drift", () => {
  test("detects looped-transformers-comparison entry presence in module source", () => {
    const source = `import loopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison.json";
export const generatedTableRegistrySourceFiles = [
  "looped-transformers-comparison.json",
] as const;
export const generatedTableRegistryPayloads = [
  loopedTransformersComparisonTableRecord,
] as const;`;

    expect(
      detectTableEntryPresenceInModuleSource(
        source,
        OBSERVED_TABLE_ENTRY_FILE_NAME,
      ),
    ).toEqual({
      importStatementPresent: true,
      payloadEntryPresent: true,
      sourceFileListEntryPresent: true,
    });
  });

  test("extracts table-entry diff lines from artifact diff", () => {
    const lines = extractTableEntryDiffLines(
      TABLE_REGISTRY_ARTIFACT_ADDED_ENTRY_DIFF_FIXTURE,
      OBSERVED_TABLE_ENTRY_FILE_NAME,
    );

    expect(
      lines.some((line) => line.includes("looped-transformers-comparison")),
    ).toBe(true);
    expect(
      lines.some((line) =>
        line.includes("loopedTransformersComparisonTableRecord"),
      ),
    ).toBe(true);
  });

  test("classifies added table entry observation from fixture diff", () => {
    const observation = classifyLoopedTransformersComparisonEntryObservation({
      diffOutput: TABLE_REGISTRY_ARTIFACT_ADDED_ENTRY_DIFF_FIXTURE,
      headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
      tableEntryFileName: OBSERVED_TABLE_ENTRY_FILE_NAME,
      worktreeSource: `import loopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison.json";`,
    });

    expect(observation.kind).toBe("added-in-diff");
    expect(observation.tableEntryId).toBe(OBSERVED_TABLE_ENTRY_ID);
    expect(observation.observedDiffLines.length).toBeGreaterThan(0);
  });

  test("captures root git truth with head, origin/main, and ahead/behind", () => {
    const fixture = createFixtureRepo();
    try {
      const gitTruth = captureRootGitTruthEvidence({
        remoteBaseRef: fixture.mainRef,
        repoRoot: fixture.repoRoot,
        runGit: (repoRoot, args) => {
          const result = spawnSync("git", [...args], {
            cwd: repoRoot,
            encoding: "utf8",
          });
          return {
            status: result.status,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
          };
        },
      });

      expect(gitTruth.headSha).toMatch(/^[0-9a-f]{40}$/);
      expect(gitTruth.remoteMainSha).toMatch(/^[0-9a-f]{40}$/);
      expect(gitTruth.remoteBaseRef).toBe("origin/main");
      expect(gitTruth.commitsAheadOfRemote).toBeGreaterThanOrEqual(0);
      expect(gitTruth.commitsBehindRemote).toBeGreaterThanOrEqual(0);
      expect(["aligned", "ahead", "behind", "diverged", "unknown"]).toContain(
        gitTruth.remoteRelationship,
      );
    } finally {
      fixture.cleanup();
    }
  });

  test("captures dirty artifact status and looped-transformers entry from fixture repo", () => {
    const fixture = createFixtureRepo();
    try {
      const statusOutput = spawnSync(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        {
          cwd: fixture.repoRoot,
          encoding: "utf8",
        },
      ).stdout;

      const evidence = captureGeneratedTableRegistryArtifactEvidence({
        artifactPath: fixture.artifactPath,
        repoRoot: fixture.repoRoot,
        runGit: (repoRoot, args) => {
          const result = spawnSync("git", [...args], {
            cwd: repoRoot,
            encoding: "utf8",
          });
          return {
            status: result.status,
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
          };
        },
        statusOutput,
        tableEntryFileName: OBSERVED_TABLE_ENTRY_FILE_NAME,
      });

      expect(evidence.dirtyStatus).toBe("dirty");
      expect(evidence.statusLine).toContain(fixture.artifactPath);
      expect(evidence.loopedTransformersComparisonEntry.kind).toBe(
        "added-in-diff",
      );
      expect(
        evidence.loopedTransformersComparisonEntry
          .importStatementPresentInWorktree,
      ).toBe(true);
      expect(
        evidence.loopedTransformersComparisonEntry
          .sourceFileListEntryPresentInWorktree,
      ).toBe(true);
      expect(evidence.diffExcerpt).toContain(
        "looped-transformers-comparison.json",
      );
    } finally {
      fixture.cleanup();
    }
  });

  test("formats planner-facing evidence report with required sections", () => {
    const report = captureOwnerlessGeneratedTableRegistryDriftEvidence({
      diffOutput: TABLE_REGISTRY_ARTIFACT_ADDED_ENTRY_DIFF_FIXTURE,
      generatedAtUtc: "2026-07-03T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/root-repo",
      runGit: (_repoRoot, args) => {
        if (args[0] === "rev-parse") {
          const ref = args[1];
          if (ref === "HEAD") {
            return {
              status: 0,
              stdout: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
              stderr: "",
            };
          }
          if (ref === "origin/main") {
            return {
              status: 0,
              stdout: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
              stderr: "",
            };
          }
        }
        if (args[0] === "rev-list" && args.includes("--left-right")) {
          return { status: 0, stdout: "0\t1\n", stderr: "" };
        }
        if (args[0] === "merge-base") {
          return {
            status: 0,
            stdout: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
            stderr: "",
          };
        }
        if (args[0] === "symbolic-ref") {
          return { status: 0, stdout: "refs/heads/main\n", stderr: "" };
        }
        if (args[0] === "show") {
          const spec = args[1];
          if (spec === `HEAD:${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`) {
            return {
              status: 0,
              stdout:
                "export const generatedTableRegistrySourceFiles = [] as const;",
              stderr: "",
            };
          }
          if (spec === `:${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`) {
            return {
              status: 0,
              stdout:
                'import loopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison.json";',
              stderr: "",
            };
          }
        }
        if (args[0] === "rev-parse" && args[1] === "--git-common-dir") {
          return { status: 0, stdout: ".git\n", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
      statusOutput: TABLE_REGISTRY_ARTIFACT_DIRTY_STATUS_FIXTURE,
    });

    const formatted =
      formatOwnerlessGeneratedTableRegistryDriftEvidenceReport(report);

    expect(formatted).toContain(
      OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_HEADER,
    );
    expect(formatted).toContain(
      "head-sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(formatted).toContain(
      "remote-main-sha=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    expect(formatted).toContain("relationship=");
    expect(formatted).toContain("ahead=");
    expect(formatted).toContain("behind=");
    expect(formatted).toContain(
      `artifact-path=${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`,
    );
    expect(formatted).toContain("dirty-status=dirty");
    expect(formatted).toContain(
      `table-entry-file=${OBSERVED_TABLE_ENTRY_FILE_NAME}`,
    );
    expect(formatted).toContain(`table-entry-id=${OBSERVED_TABLE_ENTRY_ID}`);
    expect(formatted).toContain("observation-kind=added-in-diff");
    expect(formatted).toContain(
      OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_PRESERVE_POLICY,
    );

    const serialized =
      serializeOwnerlessGeneratedTableRegistryDriftEvidenceReport(report);
    expect(serialized).toContain('"rootGitTruth"');
    expect(serialized).toContain('"generatedArtifact"');
  });

  test("report script reads fixture status without mutating git state", () => {
    const fixture = createFixtureRepo();
    try {
      const statusBefore = spawnSync(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        {
          cwd: fixture.repoRoot,
          encoding: "utf8",
        },
      ).stdout;

      const result = spawnSync(
        "bun",
        [
          "./scripts/report-ownerless-generated-table-registry-drift.ts",
          "--repo-root",
          fixture.repoRoot,
          "--remote-base-ref",
          fixture.mainRef,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_HEADER,
      );
      expect(result.stdout).toContain("dirty-status=dirty");
      expect(result.stdout).toContain(OBSERVED_TABLE_ENTRY_FILE_NAME);
      expect(result.stdout).toContain("observation-kind=added-in-diff");

      const statusAfter = spawnSync(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        {
          cwd: fixture.repoRoot,
          encoding: "utf8",
        },
      ).stdout;
      expect(statusAfter).toBe(statusBefore);
    } finally {
      fixture.cleanup();
    }
  });

  test("does not invoke mutating git commands during evidence capture", () => {
    const invokedCommands: string[] = [];
    captureOwnerlessGeneratedTableRegistryDriftEvidence({
      diffOutput: TABLE_REGISTRY_ARTIFACT_ADDED_ENTRY_DIFF_FIXTURE,
      generatedAtUtc: "2026-07-03T04:00:00.000Z",
      remoteBaseRef: "origin/main",
      repoRoot: "/tmp/root-repo",
      runGit: (_repoRoot, args) => {
        invokedCommands.push(args[0] ?? "");
        if (args[0] === "rev-parse") {
          const ref = args[1];
          if (ref === "HEAD" || ref === "origin/main") {
            return {
              status: 0,
              stdout: "cccccccccccccccccccccccccccccccccccccccc\n",
              stderr: "",
            };
          }
        }
        if (args[0] === "rev-list" && args.includes("--left-right")) {
          return { status: 0, stdout: "0\t0\n", stderr: "" };
        }
        if (args[0] === "merge-base") {
          return {
            status: 0,
            stdout: "cccccccccccccccccccccccccccccccccccccccc\n",
            stderr: "",
          };
        }
        if (args[0] === "symbolic-ref") {
          return { status: 0, stdout: "refs/heads/main\n", stderr: "" };
        }
        if (args[0] === "show") {
          return { status: 0, stdout: "", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
      statusOutput: TABLE_REGISTRY_ARTIFACT_DIRTY_STATUS_FIXTURE,
    });

    for (const command of invokedCommands) {
      expect(MUTATING_GIT_COMMANDS.has(command)).toBe(false);
    }
  });

  test("builds regeneration proof for expected table entry from canonical source catalog", () => {
    const expectedSource = createExpectedModuleSourceForTableEntry(
      OBSERVED_TABLE_ENTRY_FILE_NAME,
    );
    const proof = buildTableRegistryRegenerationProof({
      headSource: expectedSource,
      repoRoot: "/tmp/root-repo",
      tableEntryFileName: OBSERVED_TABLE_ENTRY_FILE_NAME,
      worktreeSource: expectedSource,
      loadSourceCatalog: () =>
        createSourceCatalog(OBSERVED_TABLE_ENTRY_FILE_NAME),
    });

    expect(proof.kind).toBe("full-module-match");
    expect(proof.canonicalSourceFilePresent).toBe(true);
    expect(proof.observedTableEntryInExpectedModule).toBe(true);
    expect(proof.worktreeMatchesRegeneration).toBe(true);
    expect(proof.headMatchesRegeneration).toBe(true);
  });

  test("classifies dirty expected drift from regeneration proof", () => {
    const expectedSource = createExpectedModuleSourceForTableEntry(
      OBSERVED_TABLE_ENTRY_FILE_NAME,
    );
    const classification = classifyGeneratedTableRegistryArtifactStatus({
      evidenceReport: createEvidenceReport({
        dirtyStatus: "dirty",
        headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
        observationKind: "added-in-diff",
        worktreeSource: expectedSource,
      }),
      headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
      loadSourceCatalog: () =>
        createSourceCatalog(OBSERVED_TABLE_ENTRY_FILE_NAME),
      worktreeSource: expectedSource,
    });

    expect(classification.primaryStatus).toBe("expected");
    expect(classification.regenerationProof.kind).toBe("full-module-match");
    expect(classification.evidenceGaps).toEqual([]);
    expect(classification.classificationEvidence).toContain(
      "expected-proof=deterministic-table-registry-regeneration",
    );
  });

  test("classifies stale drift when generated module does not match canonical source", () => {
    const staleSource = `import staleLoopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison-stale.json";
export const generatedTableRegistrySourceFiles = [
  "looped-transformers-comparison-stale.json",
] as const;
export const generatedTableRegistryPayloads = [
  staleLoopedTransformersComparisonTableRecord,
] as const;`;

    const classification = classifyGeneratedTableRegistryArtifactStatus({
      evidenceReport: createEvidenceReport({
        dirtyStatus: "dirty",
        headSource: staleSource,
        worktreeSource: staleSource,
      }),
      headSource: staleSource,
      loadSourceCatalog: () =>
        createSourceCatalog(OBSERVED_TABLE_ENTRY_FILE_NAME),
      worktreeSource: staleSource,
    });

    expect(classification.primaryStatus).toBe("stale");
    expect(classification.regenerationProof.kind).toBe("no-match");
    expect(classification.classificationEvidence).toContain(
      "stale-proof=generated-entry-not-reproducible-from-canonical-source",
    );
  });

  test("classifies dirty drift as owned when a lane claims the generated artifact", () => {
    const classification = classifyGeneratedTableRegistryArtifactStatus({
      evidenceReport: createEvidenceReport({
        dirtyStatus: "dirty",
        headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
        observationKind: "added-in-diff",
        worktreeSource: createExpectedModuleSourceForTableEntry(
          OBSERVED_TABLE_ENTRY_FILE_NAME,
        ),
      }),
      laneOwnership: createLaneOwnership("looped-transformers-page"),
      loadSourceCatalog: () => null,
    });

    expect(classification.primaryStatus).toBe("owned");
    expect(classification.laneOwnership?.laneName).toBe(
      "looped-transformers-page",
    );
    expect(classification.classificationEvidence).toContain(
      "lane-name=looped-transformers-page",
    );
  });

  test("classifies ownerless drift when regeneration and ownership proof are unavailable", () => {
    const classification = classifyGeneratedTableRegistryArtifactStatus({
      evidenceReport: createEvidenceReport({
        dirtyStatus: "dirty",
        headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
        observationKind: "added-in-diff",
        worktreeSource: `import loopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison.json";`,
      }),
      headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
      loadSourceCatalog: () => null,
      worktreeSource: `import loopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison.json";`,
    });

    expect(classification.primaryStatus).toBe("ownerless");
    expect(classification.evidenceGaps.length).toBeGreaterThan(0);
    expect(classification.classificationEvidence).toContain(
      "ownerless-proof=evidence-gap",
    );
  });

  test("formats unified report with evidence, classification, and next-action sections", () => {
    const expectedSource = createExpectedModuleSourceForTableEntry(
      OBSERVED_TABLE_ENTRY_FILE_NAME,
    );
    const evidenceReport = createEvidenceReport({
      dirtyStatus: "clean",
      headSource: expectedSource,
      worktreeSource: expectedSource,
    });
    const classificationReport =
      buildOwnerlessGeneratedTableRegistryDriftClassificationReport({
        evidenceReport,
        generatedAtUtc: "2026-07-03T05:00:00.000Z",
        headSource: expectedSource,
        loadSourceCatalog: () =>
          createSourceCatalog(OBSERVED_TABLE_ENTRY_FILE_NAME),
        worktreeSource: expectedSource,
      });

    const formatted = formatOwnerlessGeneratedTableRegistryDriftUnifiedReport({
      classificationReport,
      evidenceReport,
    });

    expect(formatted).toContain(
      OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_HEADER,
    );
    expect(formatted).toContain(
      OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_CLASSIFICATION_HEADER,
    );
    expect(formatted).toContain(
      OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_NEXT_ACTION_HEADER,
    );
    expect(formatted).toContain("primary-status=expected");
    expect(formatted).toContain(`table-entry-id=${OBSERVED_TABLE_ENTRY_ID}`);
    expect(formatted).toContain(
      "expected-proof=deterministic-table-registry-regeneration",
    );
    expect(formatted).toContain(
      "next-safe-action=land-minimal-generated-registry-proof",
    );
    expect(formatted).toContain(
      `artifact-path=${GENERATED_TABLE_REGISTRY_ARTIFACT_PATH}`,
    );
  });

  test("emits expected next action to land minimal generated registry proof", () => {
    const expectedSource = createExpectedModuleSourceForTableEntry(
      OBSERVED_TABLE_ENTRY_FILE_NAME,
    );
    const classification = classifyGeneratedTableRegistryArtifactStatus({
      evidenceReport: createEvidenceReport({
        dirtyStatus: "dirty",
        headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
        observationKind: "added-in-diff",
        worktreeSource: expectedSource,
      }),
      headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
      loadSourceCatalog: () =>
        createSourceCatalog(OBSERVED_TABLE_ENTRY_FILE_NAME),
      worktreeSource: expectedSource,
    });

    const nextAction =
      resolveGeneratedTableRegistryArtifactNextAction(classification);

    expect(nextAction.action).toBe("land-minimal-generated-registry-proof");
    expect(nextAction.primaryStatus).toBe("expected");
    expect(nextAction.reason).toContain(OBSERVED_TABLE_ENTRY_FILE_NAME);
    expect(nextAction.reason).toContain("src/content/registry/tables");
    expect(nextAction.missingEvidence).toEqual([]);
  });

  test("emits stale next action for operator-reviewed scoped cleanup", () => {
    const staleSource = `import staleLoopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison-stale.json";
export const generatedTableRegistrySourceFiles = [
  "looped-transformers-comparison-stale.json",
] as const;
export const generatedTableRegistryPayloads = [
  staleLoopedTransformersComparisonTableRecord,
] as const;`;
    const classification = classifyGeneratedTableRegistryArtifactStatus({
      evidenceReport: createEvidenceReport({
        dirtyStatus: "dirty",
        headSource: staleSource,
        worktreeSource: staleSource,
      }),
      headSource: staleSource,
      loadSourceCatalog: () =>
        createSourceCatalog(OBSERVED_TABLE_ENTRY_FILE_NAME),
      worktreeSource: staleSource,
    });

    const nextAction =
      resolveGeneratedTableRegistryArtifactNextAction(classification);

    expect(nextAction.action).toBe("operator-cleanup-scoped-artifact");
    expect(nextAction.primaryStatus).toBe("stale");
    expect(nextAction.reason).toContain(GENERATED_TABLE_REGISTRY_ARTIFACT_PATH);
    expect(nextAction.reason).toContain("operator-reviewed cleanup");
  });

  test("emits owned next action to wait for or inspect the named lane", () => {
    const classification = classifyGeneratedTableRegistryArtifactStatus({
      evidenceReport: createEvidenceReport({
        dirtyStatus: "dirty",
        headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
        observationKind: "added-in-diff",
        worktreeSource: createExpectedModuleSourceForTableEntry(
          OBSERVED_TABLE_ENTRY_FILE_NAME,
        ),
      }),
      laneOwnership: createLaneOwnership("looped-transformers-page"),
      loadSourceCatalog: () => null,
    });

    const nextAction =
      resolveGeneratedTableRegistryArtifactNextAction(classification);

    expect(nextAction.action).toBe("wait-for-or-inspect-named-lane");
    expect(nextAction.primaryStatus).toBe("owned");
    expect(nextAction.laneName).toBe("looped-transformers-page");
    expect(nextAction.laneBranch).toBe("looped-transformers-page-branch");
    expect(nextAction.reason).toContain("looped-transformers-page");
    expect(nextAction.reason).toContain("instead of treating");
  });

  test("emits ownerless planner hold with exact missing evidence gaps", () => {
    const classification = classifyGeneratedTableRegistryArtifactStatus({
      evidenceReport: createEvidenceReport({
        dirtyStatus: "dirty",
        headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
        observationKind: "added-in-diff",
        worktreeSource: `import loopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison.json";`,
      }),
      headSource: `export const generatedTableRegistrySourceFiles = [] as const;`,
      loadSourceCatalog: () => null,
      worktreeSource: `import loopedTransformersComparisonTableRecord from "@/content/registry/tables/looped-transformers-comparison.json";`,
    });

    const nextAction =
      resolveGeneratedTableRegistryArtifactNextAction(classification);

    expect(nextAction.action).toBe("planner-hold-missing-evidence");
    expect(nextAction.primaryStatus).toBe("ownerless");
    expect(nextAction.missingEvidence.length).toBeGreaterThan(0);
    expect(nextAction.reason).toContain("Hold priority refill");
    for (const gap of classification.evidenceGaps) {
      expect(nextAction.reason).toContain(gap);
    }
  });

  test("builds planner report with one explicit next action", () => {
    const expectedSource = createExpectedModuleSourceForTableEntry(
      OBSERVED_TABLE_ENTRY_FILE_NAME,
    );
    const evidenceReport = createEvidenceReport({
      dirtyStatus: "clean",
      headSource: expectedSource,
      worktreeSource: expectedSource,
    });
    const classificationReport =
      buildOwnerlessGeneratedTableRegistryDriftClassificationReport({
        evidenceReport,
        generatedAtUtc: "2026-07-03T05:00:00.000Z",
        headSource: expectedSource,
        loadSourceCatalog: () =>
          createSourceCatalog(OBSERVED_TABLE_ENTRY_FILE_NAME),
        worktreeSource: expectedSource,
      });
    const plannerReport =
      buildOwnerlessGeneratedTableRegistryDriftPlannerReport({
        classificationReport,
        evidenceReport,
        generatedAtUtc: "2026-07-03T05:00:00.000Z",
      });

    expect(plannerReport.nextAction.action).toBe(
      "land-minimal-generated-registry-proof",
    );
    expect(plannerReport.nextAction.tableEntryId).toBe(OBSERVED_TABLE_ENTRY_ID);
  });

  test("report script emits classification output without mutating git state", () => {
    const fixture = createFixtureRepo();
    try {
      mkdirSync(join(fixture.repoRoot, "src/content/registry/tables"), {
        recursive: true,
      });
      writeFileSync(
        join(
          fixture.repoRoot,
          "src/content/registry/tables",
          OBSERVED_TABLE_ENTRY_FILE_NAME,
        ),
        JSON.stringify({ id: OBSERVED_TABLE_ENTRY_ID }),
      );

      const statusBefore = spawnSync(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        {
          cwd: fixture.repoRoot,
          encoding: "utf8",
        },
      ).stdout;

      const result = spawnSync(
        "bun",
        [
          "./scripts/report-ownerless-generated-table-registry-drift.ts",
          "--repo-root",
          fixture.repoRoot,
          "--remote-base-ref",
          fixture.mainRef,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_CLASSIFICATION_HEADER,
      );
      expect(result.stdout).toContain("primary-status=expected");
      expect(result.stdout).toContain(OBSERVED_TABLE_ENTRY_FILE_NAME);
      expect(result.stdout).toContain(
        OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_NEXT_ACTION_HEADER,
      );
      expect(result.stdout).toContain(
        "next-safe-action=land-minimal-generated-registry-proof",
      );

      const statusAfter = spawnSync(
        "git",
        ["status", "--porcelain=v1", "--untracked-files=all"],
        {
          cwd: fixture.repoRoot,
          encoding: "utf8",
        },
      ).stdout;
      expect(statusAfter).toBe(statusBefore);
    } finally {
      fixture.cleanup();
    }
  });

  test("loads live table registry source catalog from repo root", () => {
    const catalog = loadTableRegistrySourceCatalog(
      process.cwd(),
      OBSERVED_TABLE_ENTRY_FILE_NAME,
    );

    expect(catalog).not.toBeNull();
    expect(catalog?.canonicalSourceFilePresent).toBe(true);
    expect(catalog?.sourceFileNames).toContain(OBSERVED_TABLE_ENTRY_FILE_NAME);
    expect(
      renderExpectedTableRegistryModuleSource(catalog?.sourceFileNames ?? []),
    ).toContain(OBSERVED_TABLE_ENTRY_FILE_NAME);
  });
});
