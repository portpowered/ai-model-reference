import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  discoverPlannerConcurrencyFloorReport,
  formatPlannerConcurrencyFloorReport,
  type PlannerBacklogTaskFile,
  type PlannerRootDirtyPathEvidence,
  type PlannerTempStateFile,
  serializePlannerConcurrencyFloorReport,
} from "../src/lib/factory/planner-concurrency-floor-report";
import { parsePlannerRelevantDirtyPaths } from "../src/lib/factory/planner-worktree-drift-watchdog";

const defaultRepoRoot = resolve(import.meta.dir, "..");
const DEFAULT_CONCURRENCY_FLOOR = 3;

function readFlagValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function readRequiredJsonFile(path: string, label: string): string {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label} fixture at ${path}`);
  }
  return readFileSync(path, "utf8");
}

function readOptionalTextFile(path: string): string | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return readFileSync(path, "utf8");
}

function collectMarkdownFiles(rootPath: string): string[] {
  if (!existsSync(rootPath)) {
    return [];
  }

  const pending = [rootPath];
  const files: string[] = [];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        files.push(entryPath);
      }
    }
  }

  return files.sort();
}

function collectTextSnapshots<
  T extends PlannerBacklogTaskFile | PlannerTempStateFile,
>(rootPath: string): T[] {
  return collectMarkdownFiles(rootPath).map((path) => ({
    path: path.replace(`${rootPath}/`, "").replace(/\\/g, "/"),
    text: readFileSync(path, "utf8"),
  })) as T[];
}

function isJsonOutputRequested(argv: string[]): boolean {
  return (
    argv.includes("--json") ||
    (argv.includes("--format") &&
      argv[argv.indexOf("--format") + 1]?.trim().toLowerCase() === "json")
  );
}

function runYouJsonCommand(repoRoot: string, args: string[]): string {
  const attempts = [
    [...args, "--json"],
    [...args, "--format", "json"],
  ];

  for (const attempt of attempts) {
    const proc = Bun.spawnSync(["you", ...attempt], {
      cwd: repoRoot,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode === 0 && proc.stdout.toString().trim()) {
      return proc.stdout.toString();
    }
  }

  throw new Error(
    `Unable to read live queue JSON from \`you ${args.join(" ")}\`.`,
  );
}

function readPlannerRootDirtyPathSnapshot(repoRoot: string): {
  available: boolean;
  paths: PlannerRootDirtyPathEvidence[];
} {
  const gitStatusOverridePath = readFlagValue("--root-git-status-file");
  const gitStatusText = gitStatusOverridePath
    ? readOptionalTextFile(resolve(gitStatusOverridePath))
    : undefined;

  if (typeof gitStatusText === "string") {
    return {
      available: true,
      paths: parsePlannerRelevantDirtyPaths(gitStatusText, "root").map(
        (dirtyPath) => ({
          path: dirtyPath.path,
          surface: dirtyPath.surface,
        }),
      ),
    };
  }

  const proc = Bun.spawnSync(
    ["git", "status", "--porcelain=v1", "--untracked-files=all"],
    {
      cwd: repoRoot,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  if (proc.exitCode !== 0) {
    return {
      available: false,
      paths: [],
    };
  }

  return {
    available: true,
    paths: parsePlannerRelevantDirtyPaths(proc.stdout.toString(), "root").map(
      (dirtyPath) => ({
        path: dirtyPath.path,
        surface: dirtyPath.surface,
      }),
    ),
  };
}

function readConcurrencyFloor(): number {
  const rawValue =
    readFlagValue("--floor") ?? process.env.PLANNER_CONCURRENCY_FLOOR;
  if (!rawValue) {
    return DEFAULT_CONCURRENCY_FLOOR;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(
      `Invalid concurrency floor "${rawValue}". Use a positive integer.`,
    );
  }
  return parsed;
}

const repoRoot = readFlagValue("--repo-root")
  ? resolve(readFlagValue("--repo-root") as string)
  : defaultRepoRoot;
const tasksRoot = readFlagValue("--tasks-root")
  ? resolve(readFlagValue("--tasks-root") as string)
  : resolve(repoRoot, "tasks");
const tempRoot = readFlagValue("--temp-root")
  ? resolve(readFlagValue("--temp-root") as string)
  : resolve(repoRoot, "docs", "temp");
const sourceSession = readFlagValue("--session") ?? "~default";
const workListPath = readFlagValue("--work-list-json");
const concurrencyFloor = readConcurrencyFloor();

const workListJsonText = workListPath
  ? readRequiredJsonFile(workListPath, "work list")
  : runYouJsonCommand(repoRoot, ["work", "list", "--session", sourceSession]);
const taskFiles = collectTextSnapshots<PlannerBacklogTaskFile>(tasksRoot);
const tempStateFiles = collectTextSnapshots<PlannerTempStateFile>(tempRoot);
const plannerRootDirtyPaths = readPlannerRootDirtyPathSnapshot(repoRoot);

const report = discoverPlannerConcurrencyFloorReport({
  concurrencyFloor,
  plannerRootDirtyPaths: plannerRootDirtyPaths.paths,
  plannerRootDirtyPathsAvailable: plannerRootDirtyPaths.available,
  sourceSession,
  taskFiles,
  tempStateFiles,
  workListJsonText,
});

const output = isJsonOutputRequested(process.argv)
  ? serializePlannerConcurrencyFloorReport(report)
  : `${formatPlannerConcurrencyFloorReport(report)}\n`;

process.stdout.write(output);
