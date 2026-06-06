import {
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW,
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS,
  BATCH_011_FOLLOW_UP_HOME_ROUTE,
  BATCH_011_FOLLOW_UP_NAV_ROUTE,
} from "./batch-011-follow-up-home-nav-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskHomeFollowUpRows,
  buildCustomerAskNavThemeFollowUpRow,
} from "./customer-ask-home-nav-follow-up-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskHomeNavFollowUpChecksOptions = {
  timeoutMs?: number;
};

const HOME_FOLLOW_UP_CHECKS = [
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity,
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrowseLinks,
] as const;

function buildHomeHttpFailureRows(reason: string): CustomerAskConvergenceRow[] {
  return HOME_FOLLOW_UP_CHECKS.map((check) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: BATCH_011_FOLLOW_UP_HOME_ROUTE,
    reason,
    checklistRow: BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW,
  }));
}

function buildNavHttpFailureRow(reason: string): CustomerAskConvergenceRow {
  const check = BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle;
  return {
    checkId: check.checkId,
    title: check.title,
    status: "fail",
    route: BATCH_011_FOLLOW_UP_NAV_ROUTE,
    reason,
    checklistRow: BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW,
  };
}

/**
 * Fetches built `/` and docs-shell module HTML and returns batch-011 home/nav
 * follow-up customer-ask convergence rows.
 */
export async function runCustomerAskHomeNavFollowUpChecks(
  baseUrl: string,
  options: RunCustomerAskHomeNavFollowUpChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const homeUrl = `${normalizedBase}${BATCH_011_FOLLOW_UP_HOME_ROUTE}`;
  const navUrl = `${normalizedBase}${BATCH_011_FOLLOW_UP_NAV_ROUTE}`;

  let homeHtml: string;
  try {
    const { status, body } = await httpGetText(homeUrl, timeoutMs);
    if (status !== 200) {
      return [
        ...buildHomeHttpFailureRows(
          `expected HTTP 200, received HTTP ${status}`,
        ),
        buildNavHttpFailureRow("home route failed before nav follow-up fetch"),
      ];
    }
    homeHtml = body;
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return [
      ...buildHomeHttpFailureRows(reason),
      buildNavHttpFailureRow("home route failed before nav follow-up fetch"),
    ];
  }

  let navHtml: string;
  try {
    const { status, body } = await httpGetText(navUrl, timeoutMs);
    if (status !== 200) {
      return [
        ...buildCustomerAskHomeFollowUpRows(homeHtml),
        buildNavHttpFailureRow(`expected HTTP 200, received HTTP ${status}`),
      ];
    }
    navHtml = body;
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return [
      ...buildCustomerAskHomeFollowUpRows(homeHtml),
      buildNavHttpFailureRow(reason),
    ];
  }

  return [
    ...buildCustomerAskHomeFollowUpRows(homeHtml),
    buildCustomerAskNavThemeFollowUpRow(navHtml),
  ];
}
