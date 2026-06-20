import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface CommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function runCommand(
  cwd: string,
  command: string[],
  env?: Record<string, string>,
): CommandResult {
  const [binary, ...args] = command;
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function runGit(cwd: string, args: string[]): CommandResult {
  return runCommand(cwd, ["git", ...args]);
}

describe("setup-workspace metadata stamp", () => {
  test("writes and refreshes a single canonical lane metadata record", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "setup-workspace-command-"));
    const prdName = "story-alpha";
    const scriptPath = join(
      repoRoot,
      "factory",
      "scripts",
      "setup-workspace.py",
    );
    const prdPath = join(repoRoot, "tasks", "todo", `${prdName}.json`);

    mkdirSync(join(repoRoot, "factory", "scripts"), { recursive: true });
    mkdirSync(join(repoRoot, "tasks", "todo"), { recursive: true });
    writeFileSync(
      scriptPath,
      readFileSync(
        join(process.cwd(), "factory", "scripts", "setup-workspace.py"),
        "utf8",
      ),
    );
    writeFileSync(
      prdPath,
      JSON.stringify({ branchName: prdName, userStories: [] }, null, 2),
    );

    expect(runGit(repoRoot, ["init", "--initial-branch=main"]).status).toBe(0);
    expect(
      runGit(repoRoot, ["config", "user.email", "fixture@example.com"]).status,
    ).toBe(0);
    expect(runGit(repoRoot, ["config", "user.name", "Fixture"]).status).toBe(0);
    expect(runGit(repoRoot, ["add", "."]).status).toBe(0);
    expect(runGit(repoRoot, ["commit", "-m", "base"]).status).toBe(0);

    const firstRun = runCommand(repoRoot, ["python3", scriptPath, prdName], {
      YOU_SESSION_ID: "session-setup-1",
    });
    expect(firstRun.status).toBe(0);

    const firstOutput = JSON.parse(firstRun.stdout) as {
      worktree: string;
      worktree_metadata_path: string;
      reused: boolean;
    };
    expect(firstOutput.reused).toBe(false);

    const firstMetadataPath = firstOutput.worktree_metadata_path;
    const firstMetadata = JSON.parse(
      readFileSync(firstMetadataPath, "utf8"),
    ) as {
      schemaVersion: number;
      workItemName: string;
      branchName: string;
      branchMetadataSource: string;
      worktreePath: string;
      sessionId: string | null;
      pullRequest: null;
      createdAtUtc: string;
      refreshedAtUtc: string;
      linkage: {
        branch: {
          status: string;
          refreshedAtUtc: string;
        };
        pullRequest: {
          status: string;
          issue: string;
          refreshedAtUtc: string;
        };
      };
    };

    expect(firstMetadata).toEqual({
      schemaVersion: 1,
      workItemName: prdName,
      branchName: prdName,
      branchMetadataSource: "setup",
      worktreePath: firstOutput.worktree,
      sessionId: "session-setup-1",
      pullRequest: null,
      createdAtUtc: firstMetadata.createdAtUtc,
      refreshedAtUtc: firstMetadata.refreshedAtUtc,
      linkage: {
        branch: {
          status: "current",
          refreshedAtUtc: firstMetadata.refreshedAtUtc,
        },
        pullRequest: {
          status: "missing",
          issue: "pull request linkage has not been refreshed yet",
          refreshedAtUtc: firstMetadata.refreshedAtUtc,
        },
      },
    });
    expect(firstMetadata.createdAtUtc).toMatch(/Z$/);
    expect(firstMetadata.refreshedAtUtc).toMatch(/Z$/);

    const secondRun = runCommand(repoRoot, ["python3", scriptPath, prdName], {
      FACTORY_SESSION_ID: "session-setup-2",
    });
    expect(secondRun.status).toBe(0);

    const secondOutput = JSON.parse(secondRun.stdout) as {
      worktree_metadata_path: string;
      reused: boolean;
    };
    expect(secondOutput.reused).toBe(true);
    expect(secondOutput.worktree_metadata_path).toBe(firstMetadataPath);

    const secondMetadata = JSON.parse(
      readFileSync(secondOutput.worktree_metadata_path, "utf8"),
    ) as typeof firstMetadata;
    expect(secondMetadata.createdAtUtc).toBe(firstMetadata.createdAtUtc);
    expect(secondMetadata.refreshedAtUtc).not.toBe(
      firstMetadata.refreshedAtUtc,
    );
    expect(secondMetadata.sessionId).toBe("session-setup-2");
    expect(
      readdirSync(join(firstOutput.worktree, ".claude")).filter((entry) =>
        entry.endsWith(".json"),
      ),
    ).toEqual(["lane-metadata.json"]);

    rmSync(repoRoot, { recursive: true, force: true });
  });
});
