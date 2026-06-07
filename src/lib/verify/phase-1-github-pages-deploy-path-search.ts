import {
  PHASE_1_SEARCH_PAGE_QUERIES,
  type Phase1SearchPageCheckFailure,
  type Phase1SearchPageQuery,
} from "./phase-1-search-page-checks";

export const DEPLOY_PATH_SEARCH_DOMAIN_ID = "deploy-path-search" as const;

export const DEPLOY_PATH_SEARCH_DOMAIN_LABEL =
  "Phase 1 deploy-path /search regression on static export";

export const DEPLOY_PATH_SEARCH_CHECKLIST_ROW =
  "phase-1-deploy-path-search" as const;

export const DEPLOY_PATH_SEARCH_ROUTE = "/search" as const;

export type DeployPathSearchStatus = "pass" | "fail" | "uncertain";

export type DeployPathSearchQuery = Phase1SearchPageQuery;

export const DEPLOY_PATH_SEARCH_QUERIES = PHASE_1_SEARCH_PAGE_QUERIES;

export type DeployPathSearchCheckDefinition = {
  checkId: string;
  title: string;
};

export type DeployPathSearchCheckRow = {
  checkId: string;
  title: string;
  status: DeployPathSearchStatus;
  route: typeof DEPLOY_PATH_SEARCH_ROUTE;
  query: DeployPathSearchQuery;
  reason?: string;
  checklistRow: string;
};

export type DeployPathSearchEvidence = {
  domainId: typeof DEPLOY_PATH_SEARCH_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: DeployPathSearchStatus;
  reason?: string;
  rows: readonly DeployPathSearchCheckRow[];
};

export type DeriveDeployPathSearchEvidenceInput = {
  skipped?: boolean;
  skipReason?: string;
  skipStatus?: DeployPathSearchStatus;
  rows?: readonly DeployPathSearchCheckRow[];
};

function slugForQuery(query: DeployPathSearchQuery): string {
  if (query === "KV cache") {
    return "kv-cache";
  }
  return query.toLowerCase();
}

/**
 * Canonical deploy-path search check metadata for a Phase 1 `/search` query.
 */
export function deployPathSearchCheckForQuery(
  query: DeployPathSearchQuery,
): DeployPathSearchCheckDefinition {
  return {
    checkId: `deploy-path-search.search.page.${slugForQuery(query)}`,
    title: `Deploy-path /search returns grouped-query-attention for query "${query}"`,
  };
}

function aggregateStatuses(
  statuses: readonly DeployPathSearchStatus[],
): DeployPathSearchStatus {
  if (statuses.some((status) => status === "fail")) {
    return "fail";
  }
  if (statuses.some((status) => status === "uncertain")) {
    return "uncertain";
  }
  return "pass";
}

function buildCheckRow(
  check: DeployPathSearchCheckDefinition,
  query: DeployPathSearchQuery,
  reason: string | null,
): DeployPathSearchCheckRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route: DEPLOY_PATH_SEARCH_ROUTE,
    query,
    reason: reason ?? undefined,
    checklistRow: DEPLOY_PATH_SEARCH_CHECKLIST_ROW,
  };
}

/**
 * Builds one deploy-path search row from a `/search` query probe outcome.
 */
export function buildDeployPathSearchRowForQuery(
  query: DeployPathSearchQuery,
  reason: string | null,
): DeployPathSearchCheckRow {
  return buildCheckRow(deployPathSearchCheckForQuery(query), query, reason);
}

/**
 * Converts `runPhase1SearchPageChecks` failures into one row per query.
 */
export function buildDeployPathSearchRowsFromFailures(
  failures: readonly Phase1SearchPageCheckFailure[],
  queries: readonly DeployPathSearchQuery[] = DEPLOY_PATH_SEARCH_QUERIES,
): DeployPathSearchCheckRow[] {
  const failureByQuery = new Map(
    failures.map((failure) => [failure.query, failure.reason]),
  );

  return queries.map((query) =>
    buildDeployPathSearchRowForQuery(query, failureByQuery.get(query) ?? null),
  );
}

function buildSkippedEvidence(
  status: DeployPathSearchStatus,
  reason: string,
): DeployPathSearchEvidence {
  return {
    domainId: DEPLOY_PATH_SEARCH_DOMAIN_ID,
    label: DEPLOY_PATH_SEARCH_DOMAIN_LABEL,
    checklistRow: DEPLOY_PATH_SEARCH_CHECKLIST_ROW,
    status,
    reason,
    rows: [],
  };
}

/**
 * Derives deploy-path-search pass/fail/uncertain evidence from probe rows or
 * an upstream skip reason when static harness acquisition did not complete.
 */
export function deriveDeployPathSearchEvidence(
  input: DeriveDeployPathSearchEvidenceInput,
): DeployPathSearchEvidence {
  if (input.skipped) {
    return buildSkippedEvidence(
      input.skipStatus ?? "uncertain",
      input.skipReason ??
        "Deploy-path search probes skipped because an upstream workflow stage did not complete.",
    );
  }

  const rows = input.rows ?? [];
  if (rows.length === 0) {
    return buildSkippedEvidence(
      "uncertain",
      "Deploy-path search probes did not produce any check rows.",
    );
  }

  return {
    domainId: DEPLOY_PATH_SEARCH_DOMAIN_ID,
    label: DEPLOY_PATH_SEARCH_DOMAIN_LABEL,
    checklistRow: DEPLOY_PATH_SEARCH_CHECKLIST_ROW,
    status: aggregateStatuses(rows.map((row) => row.status)),
    rows,
  };
}

function formatLocationSuffix(row: DeployPathSearchCheckRow): string {
  return ` (route=${row.route}, query=${row.query})`;
}

export function formatDeployPathSearchDomainLine(
  evidence: DeployPathSearchEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}

export function formatDeployPathSearchCheckRowLine(
  row: DeployPathSearchCheckRow,
): string {
  const status = row.status.toUpperCase();
  const location = formatLocationSuffix(row);
  const reason = row.status !== "pass" && row.reason ? ` — ${row.reason}` : "";
  return `  [${status}] ${row.checkId} — ${row.title}${location}${reason} — checklistRow=${row.checklistRow}`;
}
