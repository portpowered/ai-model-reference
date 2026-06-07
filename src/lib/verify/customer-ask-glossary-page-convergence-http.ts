import {
  BATCH_012_GLOSSARY_CHECKLIST_ROW,
  BATCH_012_GLOSSARY_CHECKS,
  BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_012_GLOSSARY_ROUTES,
} from "./batch-012-glossary-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskEmbeddingDescriptionLinksRow,
  buildCustomerAskGlossaryNoOpeningSummaryRowForRoute,
  type GlossaryOpeningSummaryRoute,
} from "./customer-ask-glossary-page-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskGlossaryPageChecksOptions = {
  timeoutMs?: number;
};

const GLOSSARY_PAGE_FETCH_ROUTES = [
  BATCH_012_GLOSSARY_ROUTES.token,
  BATCH_012_GLOSSARY_ROUTES.embedding,
  BATCH_012_GLOSSARY_ROUTES.vector,
  BATCH_012_GLOSSARY_ROUTES.hiddenSize,
] as const;

type GlossaryPageHttpCheck = {
  route: string;
  checkId: string;
  title: string;
  checklistRow: string;
  buildRow: (html: string, route: string) => CustomerAskConvergenceRow;
};

const GLOSSARY_PAGE_HTTP_CHECKS: readonly GlossaryPageHttpCheck[] = [
  ...BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES.map((route) => ({
    route,
    checkId: BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
    title: BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.title,
    checklistRow: BATCH_012_GLOSSARY_CHECKLIST_ROW,
    buildRow: (html: string, openingRoute: string) =>
      buildCustomerAskGlossaryNoOpeningSummaryRowForRoute(
        html,
        openingRoute as GlossaryOpeningSummaryRoute,
      ),
  })),
  {
    route: BATCH_012_GLOSSARY_ROUTES.embedding,
    checkId: BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
    title: BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.title,
    checklistRow: BATCH_012_GLOSSARY_CHECKLIST_ROW,
    buildRow: (html: string) =>
      buildCustomerAskEmbeddingDescriptionLinksRow(html),
  },
];

function buildHttpFailureRow(
  check: Pick<GlossaryPageHttpCheck, "checkId" | "title" | "checklistRow">,
  route: string,
  reason: string,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: "fail",
    route,
    reason,
    checklistRow: check.checklistRow,
  };
}

/**
 * Fetches built glossary routes and returns per-route opening-summary plus
 * embedding description-link customer-ask rows for the canonical verifier.
 */
export async function runCustomerAskGlossaryPageChecks(
  baseUrl: string,
  options: RunCustomerAskGlossaryPageChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  type FetchResult = { ok: true; body: string } | { ok: false; reason: string };

  const fetchResults = new Map<string, FetchResult>();

  for (const route of GLOSSARY_PAGE_FETCH_ROUTES) {
    const url = `${normalizedBase}${route}`;
    try {
      const { status, body } = await httpGetText(url, timeoutMs);
      if (status !== 200) {
        fetchResults.set(route, {
          ok: false,
          reason: `expected HTTP 200, received HTTP ${status}`,
        });
        continue;
      }
      fetchResults.set(route, { ok: true, body });
    } catch (error) {
      const reason =
        error instanceof FetchTimeoutError
          ? `request timed out after ${error.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : String(error);
      fetchResults.set(route, { ok: false, reason });
    }
  }

  const rows: CustomerAskConvergenceRow[] = [];

  for (const entry of GLOSSARY_PAGE_HTTP_CHECKS) {
    const fetchResult = fetchResults.get(entry.route);
    if (!fetchResult?.ok) {
      rows.push(
        buildHttpFailureRow(
          entry,
          entry.route,
          fetchResult?.reason ?? "glossary route was not fetched",
        ),
      );
      continue;
    }

    rows.push(entry.buildRow(fetchResult.body, entry.route));
  }

  return rows;
}
