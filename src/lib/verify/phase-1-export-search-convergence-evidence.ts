import {
  EXPORT_SEARCH_SHELL_SURFACE,
  formatPhase1ExportSearchShellFailure,
  EXPORT_SEARCH_SHELL_CHECK_ID as SEARCH_EXPORT_SHELL_CHECK_ID,
  type VerifyPhase1ExportSearchShellResult,
} from "./phase-1-search-export-shell-checks";

export { SEARCH_EXPORT_SHELL_CHECK_ID as EXPORT_SEARCH_SHELL_CHECK_ID };

import {
  STATIC_REGRESSION_CHECKLIST_ROW,
  STATIC_REGRESSION_ROUTES,
  type StaticRegressionCheckRow,
  type StaticRegressionQuery,
} from "./phase-1-github-pages-static-regression";
import { PHASE_1_SEARCH_PAGE_QUERIES } from "./phase-1-search-page-checks";

/** Stable check identifier for served `/search` hydration probe evidence rows. */
export const EXPORT_SEARCH_HYDRATION_CHECK_ID =
  "export-search-hydration" as const;

/** Stable surface label for export `/search` hydration failures (distinct from route-shell). */
export const EXPORT_SEARCH_HYDRATION_SURFACE = "hydration" as const;

export const EXPORT_SEARCH_SHELL_CHECK_TITLE =
  "Exported /search HTML includes route shell markers";

export const EXPORT_SEARCH_HYDRATION_CHECK_TITLE =
  "Served /search hydration probe for Phase 1 query";

const HYDRATION_PROBE_FAILURE_PATTERN =
  /hydrat|timed out|timeout|did not hydrate|within \d+ms/i;

export type ExportSearchShellGateOutcome = VerifyPhase1ExportSearchShellResult;

export type ExportSearchHydrationProbeOutcome = {
  query: StaticRegressionQuery;
  reason?: string;
};

export type DeriveExportSearchConvergenceRowsInput = {
  shellGate: ExportSearchShellGateOutcome;
  hydrationProbes?: readonly ExportSearchHydrationProbeOutcome[];
  queries?: readonly StaticRegressionQuery[];
};

export function isHydrationProbeFailureReason(reason: string): boolean {
  return HYDRATION_PROBE_FAILURE_PATTERN.test(reason);
}

export function formatExportSearchHydrationFailureReason(
  query: string,
  domOutcome: string,
): string {
  return `${EXPORT_SEARCH_HYDRATION_SURFACE} — query=${query} — ${domOutcome}`;
}

export function formatExportSearchShellUpstreamSkipReason(
  shellReason: string,
): string {
  return `skipped: export search ${EXPORT_SEARCH_SHELL_SURFACE} failed — ${shellReason}`;
}

export function buildExportSearchShellCheckRow(
  shellGate: ExportSearchShellGateOutcome,
): StaticRegressionCheckRow {
  return {
    checkId: SEARCH_EXPORT_SHELL_CHECK_ID,
    title: EXPORT_SEARCH_SHELL_CHECK_TITLE,
    status: shellGate.ok ? "pass" : "fail",
    route: STATIC_REGRESSION_ROUTES.searchPage,
    reason: shellGate.ok
      ? undefined
      : formatPhase1ExportSearchShellFailure(shellReasonFromGate(shellGate)),
    checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
  };
}

function shellReasonFromGate(shellGate: ExportSearchShellGateOutcome): string {
  return shellGate.ok ? "" : shellGate.reason;
}

export function buildExportSearchHydrationCheckRow(
  query: StaticRegressionQuery,
  reason: string | undefined,
  options: { uncertain?: boolean; upstreamShellReason?: string } = {},
): StaticRegressionCheckRow {
  if (options.uncertain) {
    const upstreamReason =
      options.upstreamShellReason ??
      "export search route shell gate did not pass";
    return {
      checkId: EXPORT_SEARCH_HYDRATION_CHECK_ID,
      title: EXPORT_SEARCH_HYDRATION_CHECK_TITLE,
      status: "uncertain",
      route: STATIC_REGRESSION_ROUTES.searchPage,
      query,
      reason: formatExportSearchShellUpstreamSkipReason(upstreamReason),
      checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
    };
  }

  return {
    checkId: EXPORT_SEARCH_HYDRATION_CHECK_ID,
    title: EXPORT_SEARCH_HYDRATION_CHECK_TITLE,
    status: reason ? "fail" : "pass",
    route: STATIC_REGRESSION_ROUTES.searchPage,
    query,
    reason: reason
      ? formatExportSearchHydrationFailureReason(query, reason)
      : undefined,
    checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
  };
}

/**
 * Derives export-search-shell and export-search-hydration classification rows
 * for GitHub Pages convergence evidence from fixture inputs (no network).
 */
export function deriveExportSearchConvergenceRows(
  input: DeriveExportSearchConvergenceRowsInput,
): StaticRegressionCheckRow[] {
  const queries = input.queries ?? PHASE_1_SEARCH_PAGE_QUERIES;
  const rows: StaticRegressionCheckRow[] = [
    buildExportSearchShellCheckRow(input.shellGate),
  ];

  if (!input.shellGate.ok) {
    const shellReason = input.shellGate.reason;
    for (const query of queries) {
      rows.push(
        buildExportSearchHydrationCheckRow(query, undefined, {
          uncertain: true,
          upstreamShellReason: shellReason,
        }),
      );
    }
    return rows;
  }

  const hydrationProbes = input.hydrationProbes ?? [];
  const probesByQuery = new Map(
    hydrationProbes.map((probe) => [probe.query, probe.reason]),
  );

  for (const query of queries) {
    rows.push(
      buildExportSearchHydrationCheckRow(query, probesByQuery.get(query)),
    );
  }

  return rows;
}

function isSearchRouteRow(row: StaticRegressionCheckRow): boolean {
  return (
    row.route === STATIC_REGRESSION_ROUTES.searchPage ||
    row.route === STATIC_REGRESSION_ROUTES.headerDialog
  );
}

/**
 * When the route shell gate failed, downgrade search hydration probe rows that
 * would otherwise report generic timeouts as the primary failure.
 */
export function applyExportSearchShellGateToStaticRegressionRows(
  rows: readonly StaticRegressionCheckRow[],
  shellGate: ExportSearchShellGateOutcome,
): StaticRegressionCheckRow[] {
  if (shellGate.ok) {
    return [...rows];
  }

  const shellReason = shellGate.reason;
  const skipReason = formatExportSearchShellUpstreamSkipReason(shellReason);

  return rows.map((row) => {
    if (!isSearchRouteRow(row)) {
      return row;
    }

    if (row.status === "pass") {
      return row;
    }

    if (row.status === "uncertain") {
      return row;
    }

    const shouldDowngrade =
      row.reason !== undefined &&
      (isHydrationProbeFailureReason(row.reason) ||
        row.checkId.startsWith("static-regression.search."));

    if (!shouldDowngrade) {
      return row;
    }

    return {
      ...row,
      status: "uncertain",
      reason: skipReason,
    };
  });
}

/**
 * Prepends export search classification rows and applies shell-gate downgrade
 * rules to search-related static regression probe rows.
 */
export function mergeExportSearchConvergenceRows(
  probeRows: readonly StaticRegressionCheckRow[],
  input: DeriveExportSearchConvergenceRowsInput,
): StaticRegressionCheckRow[] {
  const classificationRows = deriveExportSearchConvergenceRows(input);
  const adjustedProbeRows = applyExportSearchShellGateToStaticRegressionRows(
    probeRows,
    input.shellGate,
  );
  return [...classificationRows, ...adjustedProbeRows];
}
