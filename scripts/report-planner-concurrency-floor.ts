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
const HUMAN_OUTPUT_FORMAT = "human";
const JSON_OUTPUT_FORMAT = "json";

function formatPlannerConcurrencyFloorUsage(): string {
  return [
    "Usage: bun ./scripts/report-planner-concurrency-floor.ts [options]",
    "",
    "Planner-facing advisory report for useful active lanes, the configured concurrency floor, and the next safest planner-owned refill candidates.",
    "",
    "Options:",
    "  --help                         Show this usage summary",
    "  --json                         Shortcut for --format json",
    "  --format <human|json>         Output format. Default: human",
    `  --floor <positive-integer>     Concurrency floor. Default: ${DEFAULT_CONCURRENCY_FLOOR} or PLANNER_CONCURRENCY_FLOOR`,
    "  --session <name>              Planner session to inspect. Default: ~default",
    "  --repo-root <path>            Repository root for live queue and git evidence",
    "  --work-list-json <path>       Use a saved `you work list` JSON snapshot instead of live queue data",
    "  --tasks-root <path>           Backlog root to scan for planner-owned task markdown",
    "  --temp-root <path>            Optional docs/temp root for explicit hold evidence",
    "  --root-git-status-file <path> Use a saved `git status --porcelain=v1 --untracked-files=all` snapshot",
    "",
    "Interpretation:",
    "  - `status=below-target` means useful active lanes are under the floor and `Refill Candidates` lists the safest planner-owned work to consider next.",
    "  - `recommendation=prefer` means the candidate has grounded repo-path evidence and no current alias or dirty-surface conflict.",
    "  - `recommendation=uncertain` means evidence is incomplete or only partial, so a planner should review the candidate before refilling.",
    "  - `recommendation=hold` means active ownership, explicit temp-state holds, or dirty-path overlap make the candidate unsafe to dispatch now.",
    "",
    "The report is advisory only. It never submits work or mutates queue state.",
  ].join("\n");
}

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
  return readOutputFormat(argv) === JSON_OUTPUT_FORMAT;
}

function readOutputFormat(argv: string[]): "human" | "json" {
  if (argv.includes("--json")) {
    return JSON_OUTPUT_FORMAT;
  }

  const rawFormat = readFlagValue("--format");
  if (!rawFormat) {
    return HUMAN_OUTPUT_FORMAT;
  }

  const normalized = rawFormat.trim().toLowerCase();
  if (normalized === HUMAN_OUTPUT_FORMAT || normalized === JSON_OUTPUT_FORMAT) {
    return normalized;
  }

  throw new Error(
    `Invalid output format "${rawFormat}". Use --format human or --format json.`,
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

if (process.argv.includes("--help")) {
  process.stdout.write(`${formatPlannerConcurrencyFloorUsage()}\n`);
  process.exit(0);
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
