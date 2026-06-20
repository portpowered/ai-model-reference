import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";

export const CONFLICT_HOTSPOT_REPORT_HEADER =
  "Planner conflict-hotspot snapshot";
const DEFAULT_RECENT_COMMIT_LIMIT = 40;
const DEFAULT_TOP_PATH_LIMIT = 8;
const DEFAULT_LISTED_WORKTREE_LIMIT = 8;

export type ConflictHotspotWorktree = {
  branch: string;
  path: string;
  state: "current-clean" | "current-dirty" | "tracked";
};

export type ConflictHotspotPathTouch = {
  path: string;
  touches: number;
};

export type ConflictHotspotSnapshot = {
  generatedAtUtc: string;
  recentCommitLimit: number;
  repoRoot: string;
  topPaths: readonly ConflictHotspotPathTouch[];
  worktrees: readonly ConflictHotspotWorktree[];
};

export class ConflictHotspotCollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictHotspotCollectionError";
  }
}

type ParsedWorktreeRecord = {
  branch: string | null;
  path: string;
};

function formatSpawnFailure(
  label: string,
  result: SpawnSyncReturns<string>,
): string {
  const lines = [`${label} failed.`];
  if (result.status !== null) {
    lines.push(`exit status: ${result.status}`);
  } else if (result.signal) {
    lines.push(`signal: ${result.signal}`);
  }
  if (result.error) {
    lines.push(`spawn error: ${result.error.message}`);
  }
  const stderr = result.stderr?.trim();
  const stdout = result.stdout?.trim();
  if (stderr) {
    lines.push(`stderr:\n${stderr}`);
  }
  if (stdout) {
    lines.push(`stdout:\n${stdout}`);
  }
  return lines.join("\n");
}

function runGit(repoRoot: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

export function parseWorktreeListPorcelain(
  output: string,
): readonly ParsedWorktreeRecord[] {
  const records: ParsedWorktreeRecord[] = [];
  let currentPath: string | null = null;
  let currentBranch: string | null = null;

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (currentPath) {
        records.push({ branch: currentBranch, path: currentPath });
      }
      currentPath = line.slice("worktree ".length).trim();
      currentBranch = null;
      continue;
    }

    if (line.startsWith("branch ")) {
      currentBranch = line.slice("branch ".length).trim();
    }
  }

  if (currentPath) {
    records.push({ branch: currentBranch, path: currentPath });
  }

  return records;
}

export function parseRecentPathTouches(
  output: string,
): readonly ConflictHotspotPathTouch[] {
  const counts = new Map<string, number>();

  for (const rawLine of output.split("\n")) {
    const path = rawLine.trim();
    if (!path) {
      continue;
    }
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([path, touches]) => ({ path, touches }))
    .sort((left, right) => {
      if (right.touches !== left.touches) {
        return right.touches - left.touches;
      }
      return left.path.localeCompare(right.path);
    });
}

function listTrackedWorktrees(
  repoRoot: string,
): readonly ParsedWorktreeRecord[] {
  const result = runGit(repoRoot, ["worktree", "list", "--porcelain"]);
  if (result.status !== 0) {
    throw new ConflictHotspotCollectionError(
      formatSpawnFailure("git worktree list --porcelain", result),
    );
  }

  const worktrees = parseWorktreeListPorcelain(result.stdout ?? "");
  if (worktrees.length === 0) {
    throw new ConflictHotspotCollectionError(
      "git worktree list --porcelain returned no worktrees.",
    );
  }
  return worktrees;
}

function deriveBranchLabel(branch: string | null): string {
  if (!branch) {
    return "(detached HEAD)";
  }
  return branch.replace("refs/heads/", "");
}

function isWorktreeDirty(worktreePath: string): boolean {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: worktreePath,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new ConflictHotspotCollectionError(
      formatSpawnFailure(`git status --short (${worktreePath})`, result),
    );
  }
  return Boolean(result.stdout?.trim());
}

function collectWorktreeSnapshot(
  repoRoot: string,
): readonly ConflictHotspotWorktree[] {
  return listTrackedWorktrees(repoRoot).map((worktree) => ({
    branch: deriveBranchLabel(worktree.branch),
    path: worktree.path,
    state:
      resolve(worktree.path) === resolve(repoRoot)
        ? isWorktreeDirty(worktree.path)
          ? "current-dirty"
          : "current-clean"
        : "tracked",
  }));
}

function collectRecentPathSnapshot(
  repoRoot: string,
  recentCommitLimit: number,
  topPathLimit: number,
): readonly ConflictHotspotPathTouch[] {
  const result = runGit(repoRoot, [
    "log",
    "--format=",
    "--name-only",
    `-n${recentCommitLimit}`,
    "--",
    ".",
  ]);
  if (result.status !== 0) {
    throw new ConflictHotspotCollectionError(
      formatSpawnFailure("git log --format= --name-only", result),
    );
  }

  const pathTouches = parseRecentPathTouches(result.stdout ?? "");
  if (pathTouches.length === 0) {
    throw new ConflictHotspotCollectionError(
      `Unable to collect recent path evidence from the last ${recentCommitLimit} commits.`,
    );
  }
  return pathTouches.slice(0, topPathLimit);
}

export type CollectConflictHotspotSnapshotOptions = {
  generatedAtUtc?: string;
  recentCommitLimit?: number;
  topPathLimit?: number;
};

export function collectConflictHotspotSnapshot(
  repoRoot: string,
  options: CollectConflictHotspotSnapshotOptions = {},
): ConflictHotspotSnapshot {
  const recentCommitLimit =
    options.recentCommitLimit ?? DEFAULT_RECENT_COMMIT_LIMIT;
  const topPathLimit = options.topPathLimit ?? DEFAULT_TOP_PATH_LIMIT;
  const resolvedRepoRoot = resolve(repoRoot);

  if (recentCommitLimit <= 0) {
    throw new ConflictHotspotCollectionError(
      `recentCommitLimit must be positive; received ${recentCommitLimit}.`,
    );
  }
  if (topPathLimit <= 0) {
    throw new ConflictHotspotCollectionError(
      `topPathLimit must be positive; received ${topPathLimit}.`,
    );
  }

  const gitRootResult = runGit(resolvedRepoRoot, [
    "rev-parse",
    "--show-toplevel",
  ]);
  if (gitRootResult.status !== 0 || !gitRootResult.stdout?.trim()) {
    throw new ConflictHotspotCollectionError(
      formatSpawnFailure("git rev-parse --show-toplevel", gitRootResult),
    );
  }

  const canonicalRepoRoot = gitRootResult.stdout.trim();
  return {
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    recentCommitLimit,
    repoRoot: canonicalRepoRoot,
    topPaths: collectRecentPathSnapshot(
      canonicalRepoRoot,
      recentCommitLimit,
      topPathLimit,
    ),
    worktrees: collectWorktreeSnapshot(canonicalRepoRoot),
  };
}

function formatWorktreePath(repoRoot: string, worktreePath: string): string {
  const relativePath = relative(repoRoot, worktreePath);
  return relativePath.length > 0 && !relativePath.startsWith("..")
    ? relativePath
    : worktreePath;
}

export function formatConflictHotspotSnapshot(
  snapshot: ConflictHotspotSnapshot,
): string {
  const currentWorktree = snapshot.worktrees.find(
    (worktree) =>
      worktree.state === "current-clean" || worktree.state === "current-dirty",
  );
  const listedWorktrees = snapshot.worktrees.slice(
    0,
    DEFAULT_LISTED_WORKTREE_LIMIT,
  );
  const lines = [
    CONFLICT_HOTSPOT_REPORT_HEADER,
    `Generated: ${snapshot.generatedAtUtc}`,
    `Repository: ${snapshot.repoRoot}`,
    "",
    "Evidence sources",
    `- git log --name-only sample: last ${snapshot.recentCommitLimit} commits`,
    `- git worktree list --porcelain: ${snapshot.worktrees.length} tracked worktree(s)`,
    "",
    "Active worktrees",
    `- Current worktree: ${
      currentWorktree?.state === "current-dirty" ? "dirty" : "clean"
    }`,
  ];

  for (const worktree of listedWorktrees) {
    const state =
      worktree.state === "current-dirty"
        ? "dirty"
        : worktree.state === "current-clean"
          ? "clean"
          : "tracked";
    lines.push(
      `- ${worktree.branch} (${state}) — ${formatWorktreePath(snapshot.repoRoot, worktree.path)}`,
    );
  }
  if (snapshot.worktrees.length > listedWorktrees.length) {
    lines.push(
      `- Additional tracked worktrees omitted: ${snapshot.worktrees.length - listedWorktrees.length}`,
    );
  }

  lines.push("", "Recent shared-path sample");
  for (const hotspot of snapshot.topPaths) {
    lines.push(`- ${hotspot.path} (${hotspot.touches} touches)`);
  }

  return lines.join("\n");
}
