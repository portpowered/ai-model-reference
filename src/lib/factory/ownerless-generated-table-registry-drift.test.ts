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
  captureGeneratedTableRegistryArtifactEvidence,
  captureOwnerlessGeneratedTableRegistryDriftEvidence,
  captureRootGitTruthEvidence,
  classifyLoopedTransformersComparisonEntryObservation,
  detectTableEntryPresenceInModuleSource,
  extractTableEntryDiffLines,
  formatOwnerlessGeneratedTableRegistryDriftEvidenceReport,
  GENERATED_TABLE_REGISTRY_ARTIFACT_PATH,
  OBSERVED_TABLE_ENTRY_FILE_NAME,
  OBSERVED_TABLE_ENTRY_ID,
  OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_HEADER,
  OWNERLESS_GENERATED_TABLE_REGISTRY_DRIFT_PRESERVE_POLICY,
  serializeOwnerlessGeneratedTableRegistryDriftEvidenceReport,
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
});
