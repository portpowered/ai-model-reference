import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskTagListRows,
  TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
  TAG_LIST_CUSTOMER_ASK_CHECKS,
  TAG_LIST_CUSTOMER_ASK_ROUTES,
  type TagListCustomerAskRoute,
} from "./customer-ask-tag-list-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskTagListChecksOptions = {
  timeoutMs?: number;
};

const TAG_LIST_ROUTES: TagListCustomerAskRoute[] = [
  TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
  TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding,
];

function checksForRoute(route: TagListCustomerAskRoute) {
  if (route === TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding) {
    return [
      TAG_LIST_CUSTOMER_ASK_CHECKS.attentionGroupedListSpacing,
      TAG_LIST_CUSTOMER_ASK_CHECKS.attentionListDiscNonProse,
    ];
  }

  return [
    TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing,
    TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse,
  ];
}

function buildHttpFailureRows(
  route: TagListCustomerAskRoute,
  reason: string,
): CustomerAskConvergenceRow[] {
  return checksForRoute(route).map((check) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route,
    reason,
    checklistRow: TAG_LIST_CUSTOMER_ASK_CHECKLIST_ROW,
  }));
}

async function fetchRouteHtml(
  baseUrl: string,
  route: TagListCustomerAskRoute,
  timeoutMs: number,
): Promise<{ html: string } | { failureRows: CustomerAskConvergenceRow[] }> {
  const url = `${baseUrl}${route}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return {
        failureRows: buildHttpFailureRows(
          route,
          `expected HTTP 200, received HTTP ${status}`,
        ),
      };
    }
    return { html: body };
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return { failureRows: buildHttpFailureRows(route, reason) };
  }
}

/**
 * Fetches built `/tags` and `/tags/attention` HTML and returns customer-ask tag
 * list styling convergence rows.
 */
export async function runCustomerAskTagListChecks(
  baseUrl: string,
  options: RunCustomerAskTagListChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const htmlByRoute: Partial<Record<TagListCustomerAskRoute, string>> = {};
  const rows: CustomerAskConvergenceRow[] = [];

  for (const route of TAG_LIST_ROUTES) {
    const result = await fetchRouteHtml(normalizedBase, route, timeoutMs);
    if ("failureRows" in result) {
      rows.push(...result.failureRows);
      continue;
    }
    htmlByRoute[route] = result.html;
  }

  return [...rows, ...buildCustomerAskTagListRows(htmlByRoute)];
}
