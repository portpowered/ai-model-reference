import {
  assertSearchNoMatchedTags,
  assertSearchPageLevelHits,
  type SearchSurfaceResultSnapshot,
} from "./customer-ask-search-surface-convergence";
import { assertGroupedQueryAttentionModuleConvergence } from "./grouped-query-attention-module-convergence";
import { assertHomeSearchEntryConvergence } from "./home-search-entry-convergence";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import { PHASE_1_SEARCH_PAGE_QUERIES } from "./phase-1-search-page-checks";

export const STATIC_REGRESSION_DOMAIN_ID = "phase-1-static-regression" as const;

export const STATIC_REGRESSION_DOMAIN_LABEL =
  "Phase 1 search and route regression on static export";

export const STATIC_REGRESSION_CHECKLIST_ROW =
  "phase-1-github-pages-static-regression";

export type StaticRegressionStatus = "pass" | "fail" | "uncertain";

export type StaticRegressionQuery = (typeof STATIC_REGRESSION_QUERIES)[number];

export const STATIC_REGRESSION_QUERIES = PHASE_1_SEARCH_PAGE_QUERIES;

export const STATIC_REGRESSION_ROUTES = {
  searchPage: "/search",
  headerDialog: "header-dialog",
  home: "/",
  gqaModule: PHASE_1_GROUPED_QUERY_ATTENTION_URL,
} as const;

export type StaticRegressionRoute =
  (typeof STATIC_REGRESSION_ROUTES)[keyof typeof STATIC_REGRESSION_ROUTES];

export const STATIC_REGRESSION_CHECKS = {
  searchPagePageLevelHits: {
    checkId: "static-regression.search.page.page-level-hits",
    title: "Search page lists canonical page-level hits without fragment URLs",
  },
  searchPageNoMatchedTags: {
    checkId: "static-regression.search.page.no-matched-tags",
    title: "Search page omits search-result-matched-tags chips",
  },
  searchDialogPageLevelHits: {
    checkId: "static-regression.search.dialog.page-level-hits",
    title:
      "Header search dialog lists canonical page-level hits without fragment URLs",
  },
  searchDialogNoMatchedTags: {
    checkId: "static-regression.search.dialog.no-matched-tags",
    title: "Header search dialog omits search-result-matched-tags chips",
  },
  homeHeaderSearchEntry: {
    checkId: "static-regression.route.home-header-search-entry",
    title: "Home exposes header-only search entry",
  },
  gqaModulePresentation: {
    checkId: "static-regression.route.gqa-module-presentation",
    title: "GQA module page includes converged presentation markers",
  },
} as const;

export type StaticRegressionCheckRow = {
  checkId: string;
  title: string;
  status: StaticRegressionStatus;
  route: StaticRegressionRoute;
  query?: string;
  reason?: string;
  checklistRow: string;
};

export type StaticRegressionEvidence = {
  domainId: typeof STATIC_REGRESSION_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: StaticRegressionStatus;
  reason?: string;
  rows: readonly StaticRegressionCheckRow[];
};

export type DeriveStaticRegressionEvidenceInput = {
  skipped?: boolean;
  skipReason?: string;
  rows?: readonly StaticRegressionCheckRow[];
};

function aggregateStatuses(
  statuses: readonly StaticRegressionStatus[],
): StaticRegressionStatus {
  if (statuses.some((status) => status === "fail")) {
    return "fail";
  }
  if (statuses.some((status) => status === "uncertain")) {
    return "uncertain";
  }
  return "pass";
}

function toPassFailRow(
  check: (typeof STATIC_REGRESSION_CHECKS)[keyof typeof STATIC_REGRESSION_CHECKS],
  route: StaticRegressionRoute,
  query: string | undefined,
  reason: string | null,
): StaticRegressionCheckRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route,
    query,
    reason: reason ?? undefined,
    checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
  };
}

export function buildStaticRegressionSearchPageRowsForQuery(
  snapshot: SearchSurfaceResultSnapshot,
  query: StaticRegressionQuery,
): StaticRegressionCheckRow[] {
  return [
    toPassFailRow(
      STATIC_REGRESSION_CHECKS.searchPagePageLevelHits,
      STATIC_REGRESSION_ROUTES.searchPage,
      query,
      assertSearchPageLevelHits(snapshot, query),
    ),
    toPassFailRow(
      STATIC_REGRESSION_CHECKS.searchPageNoMatchedTags,
      STATIC_REGRESSION_ROUTES.searchPage,
      query,
      assertSearchNoMatchedTags(snapshot),
    ),
  ];
}

export function buildStaticRegressionSearchDialogRowsForQuery(
  snapshot: SearchSurfaceResultSnapshot,
  query: StaticRegressionQuery,
): StaticRegressionCheckRow[] {
  return [
    toPassFailRow(
      STATIC_REGRESSION_CHECKS.searchDialogPageLevelHits,
      STATIC_REGRESSION_ROUTES.headerDialog,
      query,
      assertSearchPageLevelHits(snapshot, query),
    ),
    toPassFailRow(
      STATIC_REGRESSION_CHECKS.searchDialogNoMatchedTags,
      STATIC_REGRESSION_ROUTES.headerDialog,
      query,
      assertSearchNoMatchedTags(snapshot),
    ),
  ];
}

export function buildStaticRegressionHomeRouteRow(
  html: string,
): StaticRegressionCheckRow {
  return toPassFailRow(
    STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry,
    STATIC_REGRESSION_ROUTES.home,
    undefined,
    assertHomeSearchEntryConvergence(html),
  );
}

export function buildStaticRegressionGqaModuleRouteRow(
  html: string,
): StaticRegressionCheckRow {
  return toPassFailRow(
    STATIC_REGRESSION_CHECKS.gqaModulePresentation,
    STATIC_REGRESSION_ROUTES.gqaModule,
    undefined,
    assertGroupedQueryAttentionModuleConvergence(html),
  );
}

function buildSkippedEvidence(reason: string): StaticRegressionEvidence {
  return {
    domainId: STATIC_REGRESSION_DOMAIN_ID,
    label: STATIC_REGRESSION_DOMAIN_LABEL,
    checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
    status: "uncertain",
    reason,
    rows: [],
  };
}

/**
 * Derives phase-1-static-regression pass/fail/uncertain evidence from probe
 * rows or an upstream skip reason when static verification did not run.
 */
export function deriveStaticRegressionEvidence(
  input: DeriveStaticRegressionEvidenceInput,
): StaticRegressionEvidence {
  if (input.skipped) {
    return buildSkippedEvidence(
      input.skipReason ??
        "Static regression probes skipped because an upstream workflow stage did not complete.",
    );
  }

  const rows = input.rows ?? [];
  if (rows.length === 0) {
    return buildSkippedEvidence(
      "Static regression probes did not produce any check rows.",
    );
  }

  return {
    domainId: STATIC_REGRESSION_DOMAIN_ID,
    label: STATIC_REGRESSION_DOMAIN_LABEL,
    checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
    status: aggregateStatuses(rows.map((row) => row.status)),
    rows,
  };
}

function formatLocationSuffix(row: StaticRegressionCheckRow): string {
  const parts: string[] = [`route=${row.route}`];
  if (row.query) {
    parts.push(`query=${row.query}`);
  }
  return ` (${parts.join(", ")})`;
}

export function formatStaticRegressionDomainLine(
  evidence: StaticRegressionEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}

export function formatStaticRegressionCheckRowLine(
  row: StaticRegressionCheckRow,
): string {
  const status = row.status.toUpperCase();
  const location = formatLocationSuffix(row);
  const reason = row.status !== "pass" && row.reason ? ` — ${row.reason}` : "";
  return `  [${status}] ${row.checkId} — ${row.title}${location}${reason} — checklistRow=${row.checklistRow}`;
}
