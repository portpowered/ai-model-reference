import { spawnSync } from "node:child_process";

export interface YouJsonCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export type RunYouJsonCommand = (
  repoRoot: string,
  args: string[],
) => YouJsonCommandResult;

const JSON_OUTPUT_FLAG_VARIANTS = [["--json"], ["--format", "json"]] as const;

function defaultRunYouJsonCommand(
  repoRoot: string,
  args: string[],
): YouJsonCommandResult {
  const proc = spawnSync("you", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });

  return {
    ok: proc.status === 0,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
    exitCode: proc.status,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonText(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse failure";
    throw new Error(`${label} is not valid JSON: ${message}`);
  }
}

function extractCandidateItemArray(
  payload: unknown,
): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const preferredKeys = [
    "results",
    "items",
    "works",
    "workItems",
    "data",
    "rows",
  ];
  for (const key of preferredKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.every((item) => isRecord(item))) {
      return value as Record<string, unknown>[];
    }
  }

  return [];
}

function readPaginationNextToken(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const candidates = [
    payload.paginationContext,
    payload.pagination,
    payload.page,
  ];
  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }
    const nextToken = candidate.nextToken;
    if (typeof nextToken === "string" && nextToken.trim().length > 0) {
      return nextToken.trim();
    }
  }

  if (
    typeof payload.nextToken === "string" &&
    payload.nextToken.trim().length
  ) {
    return payload.nextToken.trim();
  }

  return undefined;
}

interface JsonPageReadResult {
  payload: unknown;
  outputFlags: readonly string[];
}

function readJsonPage(
  repoRoot: string,
  args: string[],
  label: string,
  runCommand: RunYouJsonCommand,
): JsonPageReadResult {
  for (const outputFlags of JSON_OUTPUT_FLAG_VARIANTS) {
    const result = runCommand(repoRoot, [...args, ...outputFlags]);
    if (!result.ok || result.stdout.trim().length === 0) {
      continue;
    }

    return {
      payload: parseJsonText(result.stdout, label),
      outputFlags,
    };
  }

  throw new Error(
    `Unable to read ${label} from \`you ${args.join(" ")}\` with JSON output.`,
  );
}

function readJsonPageWithFixedOutputFlags(
  repoRoot: string,
  args: string[],
  label: string,
  outputFlags: readonly string[],
  runCommand: RunYouJsonCommand,
): unknown {
  const result = runCommand(repoRoot, [...args, ...outputFlags]);
  if (!result.ok || result.stdout.trim().length === 0) {
    throw new Error(
      `Unable to read ${label} from \`you ${args.join(" ")}\` with JSON output.`,
    );
  }

  return parseJsonText(result.stdout, label);
}

export function readLiveYouJsonCommand(
  repoRoot: string,
  args: string[],
  label: string,
  runCommand: RunYouJsonCommand = defaultRunYouJsonCommand,
): string {
  const { payload } = readJsonPage(repoRoot, args, label, runCommand);
  return JSON.stringify(payload);
}

export function readCompleteLiveWorkListSnapshotJson(
  repoRoot: string,
  args: string[],
  runCommand: RunYouJsonCommand = defaultRunYouJsonCommand,
): string {
  const firstPage = readJsonPage(repoRoot, args, "work list", runCommand);
  const items = [...extractCandidateItemArray(firstPage.payload)];
  const seenNextTokens = new Set<string>();
  let nextToken = readPaginationNextToken(firstPage.payload);
  let pageCount = 1;

  while (nextToken) {
    if (seenNextTokens.has(nextToken)) {
      throw new Error(
        `Unable to complete work list pagination because nextToken ${JSON.stringify(nextToken)} repeated.`,
      );
    }

    seenNextTokens.add(nextToken);
    const continuationArgs = [...args, "--next-token", nextToken];
    const pagePayload = readJsonPageWithFixedOutputFlags(
      repoRoot,
      continuationArgs,
      `work list continuation page for nextToken ${JSON.stringify(nextToken)}`,
      firstPage.outputFlags,
      runCommand,
    );
    items.push(...extractCandidateItemArray(pagePayload));
    nextToken = readPaginationNextToken(pagePayload);
    pageCount += 1;
  }

  return JSON.stringify({
    items,
    snapshotCompleteness: {
      pageCount,
      source: "you work list live pagination",
      complete: true,
    },
  });
}
