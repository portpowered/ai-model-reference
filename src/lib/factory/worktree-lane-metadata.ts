import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PullRequestLookupFailureKind } from "@/lib/factory/active-pr-mergeability-watchdog";

export const WORKTREE_LANE_METADATA_RELATIVE_PATH =
  ".claude/lane-metadata.json";

export type WorktreeLaneMetadataBranchSource = "setup" | "git" | "prd";
export type WorktreeLaneMetadataLinkageStatus = "current" | "stale" | "missing";

export interface WorktreeLaneMetadataPullRequest {
  number: number;
  url?: string;
}

export interface WorktreeLaneMetadataLinkageField {
  status: WorktreeLaneMetadataLinkageStatus;
  issue?: string;
  refreshedAtUtc: string;
}

export interface WorktreeLaneMetadataRecord {
  schemaVersion: number;
  workItemName: string;
  branchName?: string;
  branchMetadataSource?: WorktreeLaneMetadataBranchSource;
  worktreePath: string;
  sessionId?: string | null;
  pullRequest: WorktreeLaneMetadataPullRequest | null;
  createdAtUtc: string;
  refreshedAtUtc: string;
  linkage: {
    branch: WorktreeLaneMetadataLinkageField;
    pullRequest: WorktreeLaneMetadataLinkageField;
  };
}

export interface RefreshWorktreeLaneMetadataOptions {
  worktreePath: string;
  branchName?: string;
  branchMetadataSource?: Exclude<WorktreeLaneMetadataBranchSource, "setup">;
  branchIssue?: string;
  pullRequestLookup?: {
    status: "resolved" | "missing";
    pullRequest: WorktreeLaneMetadataPullRequest | null;
    failureKind?: PullRequestLookupFailureKind;
    failureReason?: string;
  };
  refreshedAtUtc?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readPullRequest(
  value: unknown,
): WorktreeLaneMetadataPullRequest | null | undefined {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const number = readNumber(value.number);
  if (number === undefined) {
    return undefined;
  }
  return {
    number,
    url: readString(value.url),
  };
}

function normalizeLinkageField(
  value: unknown,
  fallbackStatus: WorktreeLaneMetadataLinkageStatus,
  refreshedAtUtc: string,
): WorktreeLaneMetadataLinkageField {
  if (!isRecord(value)) {
    return {
      status: fallbackStatus,
      refreshedAtUtc,
    };
  }

  const status = value.status;
  return {
    status:
      status === "current" || status === "stale" || status === "missing"
        ? status
        : fallbackStatus,
    issue: readString(value.issue),
    refreshedAtUtc: readString(value.refreshedAtUtc) ?? refreshedAtUtc,
  };
}

export function resolveWorktreeLaneMetadataPath(worktreePath: string): string {
  return join(worktreePath, WORKTREE_LANE_METADATA_RELATIVE_PATH);
}

export function readWorktreeLaneMetadata(
  worktreePath: string,
): WorktreeLaneMetadataRecord | null {
  const metadataPath = resolveWorktreeLaneMetadataPath(worktreePath);
  if (!existsSync(metadataPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(metadataPath, "utf8")) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const refreshedAtUtc =
      readString(parsed.refreshedAtUtc) ?? new Date().toISOString();
    const branchName = readString(parsed.branchName);
    const pullRequest = readPullRequest(parsed.pullRequest) ?? null;
    const linkage = isRecord(parsed.linkage) ? parsed.linkage : undefined;

    return {
      schemaVersion: readNumber(parsed.schemaVersion) ?? 1,
      workItemName: readString(parsed.workItemName) ?? "",
      branchName,
      branchMetadataSource:
        parsed.branchMetadataSource === "setup" ||
        parsed.branchMetadataSource === "git" ||
        parsed.branchMetadataSource === "prd"
          ? parsed.branchMetadataSource
          : undefined,
      worktreePath: readString(parsed.worktreePath) ?? worktreePath,
      sessionId:
        typeof parsed.sessionId === "string" || parsed.sessionId === null
          ? parsed.sessionId
          : undefined,
      pullRequest,
      createdAtUtc: readString(parsed.createdAtUtc) ?? refreshedAtUtc,
      refreshedAtUtc,
      linkage: {
        branch: normalizeLinkageField(
          linkage?.branch,
          branchName ? "current" : "missing",
          refreshedAtUtc,
        ),
        pullRequest: normalizeLinkageField(
          linkage?.pullRequest,
          pullRequest ? "current" : "missing",
          refreshedAtUtc,
        ),
      },
    };
  } catch {
    return null;
  }
}

export function writeWorktreeLaneMetadata(
  record: WorktreeLaneMetadataRecord,
): string {
  const metadataPath = resolveWorktreeLaneMetadataPath(record.worktreePath);
  mkdirSync(join(record.worktreePath, ".claude"), { recursive: true });
  writeFileSync(metadataPath, `${JSON.stringify(record, null, 2)}\n`);
  return metadataPath;
}

function derivePullRequestIssue(
  lookup: NonNullable<RefreshWorktreeLaneMetadataOptions["pullRequestLookup"]>,
): string | undefined {
  if (lookup.failureReason) {
    return lookup.failureReason;
  }
  if (lookup.status === "missing") {
    return "pull request linkage could not be refreshed";
  }
  return undefined;
}

export function refreshWorktreeLaneMetadata(
  options: RefreshWorktreeLaneMetadataOptions,
): WorktreeLaneMetadataRecord | null {
  const existingRecord = readWorktreeLaneMetadata(options.worktreePath);
  if (!existingRecord) {
    return null;
  }

  const refreshedAtUtc = options.refreshedAtUtc ?? new Date().toISOString();
  const nextBranchName = options.branchName ?? existingRecord.branchName;
  const nextBranchSource =
    options.branchMetadataSource ?? existingRecord.branchMetadataSource;

  let branchLinkage: WorktreeLaneMetadataLinkageField;
  if (options.branchName) {
    branchLinkage = {
      status: "current",
      refreshedAtUtc,
    };
  } else {
    branchLinkage = {
      status: existingRecord.branchName ? "stale" : "missing",
      issue: options.branchIssue ?? "branch linkage could not be refreshed",
      refreshedAtUtc,
    };
  }

  let pullRequest = existingRecord.pullRequest;
  let pullRequestLinkage = existingRecord.linkage.pullRequest;

  if (options.pullRequestLookup) {
    const issue = derivePullRequestIssue(options.pullRequestLookup);
    if (
      options.pullRequestLookup.status === "resolved" &&
      options.pullRequestLookup.pullRequest
    ) {
      pullRequest = options.pullRequestLookup.pullRequest;
      pullRequestLinkage = {
        status: "current",
        refreshedAtUtc,
      };
    } else {
      pullRequestLinkage = {
        status: existingRecord.pullRequest ? "stale" : "missing",
        issue,
        refreshedAtUtc,
      };
    }
  }

  const nextRecord: WorktreeLaneMetadataRecord = {
    ...existingRecord,
    branchName: nextBranchName,
    branchMetadataSource: nextBranchSource,
    pullRequest,
    refreshedAtUtc,
    linkage: {
      branch: branchLinkage,
      pullRequest: pullRequestLinkage,
    },
  };

  writeWorktreeLaneMetadata(nextRecord);
  return nextRecord;
}
