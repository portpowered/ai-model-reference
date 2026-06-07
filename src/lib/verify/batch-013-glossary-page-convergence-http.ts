import {
  BATCH_013_GLOSSARY_CHECKLIST_ROW,
  BATCH_013_GLOSSARY_CHECKS,
  BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_013_GLOSSARY_ROUTES,
} from "./batch-013-glossary-checks";
import {
  type Batch013GlossaryOpeningSummaryRoute,
  buildBatch013EmbeddingDescriptionLinksRow,
  buildBatch013GlossaryNoOpeningSummaryRow,
  buildBatch013HiddenSizeRouteRow,
  buildBatch013VectorRouteRow,
} from "./batch-013-glossary-page-convergence";
import {
  BATCH_013_ROUTE_CHECKS,
  BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
  BATCH_013_ROUTE_PATHS,
} from "./batch-013-route-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunBatch013GlossaryRouteChecksOptions = {
  timeoutMs?: number;
};

const BATCH_013_GLOSSARY_FETCH_ROUTES = [
  BATCH_013_GLOSSARY_ROUTES.token,
  BATCH_013_GLOSSARY_ROUTES.embedding,
  BATCH_013_GLOSSARY_ROUTES.vector,
  BATCH_013_GLOSSARY_ROUTES.hiddenSize,
] as const;

type Batch013GlossaryHttpCheck = {
  route: string;
  checkId: string;
  title: string;
  checklistRow: string;
  buildRow: (html: string, route: string) => CustomerAskConvergenceRow;
};

const BATCH_013_GLOSSARY_HTTP_CHECKS: readonly Batch013GlossaryHttpCheck[] = [
  ...BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES.map((route) => ({
    route,
    checkId: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
    title: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.title,
    checklistRow: BATCH_013_GLOSSARY_CHECKLIST_ROW,
    buildRow: (html: string, openingRoute: string) =>
      buildBatch013GlossaryNoOpeningSummaryRow(
        html,
        openingRoute as Batch013GlossaryOpeningSummaryRoute,
      ),
  })),
  {
    route: BATCH_013_GLOSSARY_ROUTES.embedding,
    checkId: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
    title: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.title,
    checklistRow: BATCH_013_GLOSSARY_CHECKLIST_ROW,
    buildRow: (html: string) => buildBatch013EmbeddingDescriptionLinksRow(html),
  },
  {
    route: BATCH_013_ROUTE_PATHS.vectorGlossary,
    checkId: BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
    title: BATCH_013_ROUTE_CHECKS.vectorRoute.title,
    checklistRow: BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
    buildRow: (html: string) => buildBatch013VectorRouteRow(html),
  },
  {
    route: BATCH_013_ROUTE_PATHS.hiddenSizeGlossary,
    checkId: BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
    title: BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.title,
    checklistRow: BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
    buildRow: (html: string) => buildBatch013HiddenSizeRouteRow(html),
  },
];

function buildHttpFailureRow(
  check: Pick<Batch013GlossaryHttpCheck, "checkId" | "title" | "checklistRow">,
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
 * Fetches reopened batch-013 glossary routes and returns customer-ask rows for
 * opening-summary removal, embedding description links, and vector/hidden-size
 * route resolution.
 */
export async function runBatch013GlossaryRouteChecks(
  baseUrl: string,
  options: RunBatch013GlossaryRouteChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  type FetchResult = { ok: true; body: string } | { ok: false; reason: string };

  const fetchResults = new Map<string, FetchResult>();

  for (const route of BATCH_013_GLOSSARY_FETCH_ROUTES) {
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

  for (const entry of BATCH_013_GLOSSARY_HTTP_CHECKS) {
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
