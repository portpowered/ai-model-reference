import {
  BATCH_012_GLOSSARY_CHECKLIST_ROW,
  BATCH_012_GLOSSARY_CHECKS,
  BATCH_012_GLOSSARY_ROUTES,
} from "./batch-012-glossary-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskEmbeddingDescriptionLinksRow,
  buildCustomerAskGlossaryNoOpeningSummaryRow,
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

const GLOSSARY_PAGE_CHECKS = [
  {
    route: BATCH_012_GLOSSARY_ROUTES.token,
    check: BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary,
    buildRow: buildCustomerAskGlossaryNoOpeningSummaryRow,
  },
  {
    route: BATCH_012_GLOSSARY_ROUTES.embedding,
    check: BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks,
    buildRow: buildCustomerAskEmbeddingDescriptionLinksRow,
  },
] as const;

function buildHttpFailureRow(
  check: (typeof BATCH_012_GLOSSARY_CHECKS)[keyof typeof BATCH_012_GLOSSARY_CHECKS],
  route: string,
  reason: string,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: "fail",
    route,
    reason,
    checklistRow: BATCH_012_GLOSSARY_CHECKLIST_ROW,
  };
}

/**
 * Fetches built glossary token and embedding routes and returns batch-012
 * opening-summary and description-link customer-ask rows.
 */
export async function runCustomerAskGlossaryPageChecks(
  baseUrl: string,
  options: RunCustomerAskGlossaryPageChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const rows: CustomerAskConvergenceRow[] = [];

  for (const entry of GLOSSARY_PAGE_CHECKS) {
    const url = `${normalizedBase}${entry.route}`;
    try {
      const { status, body } = await httpGetText(url, timeoutMs);
      if (status !== 200) {
        rows.push(
          buildHttpFailureRow(
            entry.check,
            entry.route,
            `expected HTTP 200, received HTTP ${status}`,
          ),
        );
        continue;
      }
      rows.push(entry.buildRow(body));
    } catch (error) {
      const reason =
        error instanceof FetchTimeoutError
          ? `request timed out after ${error.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : String(error);
      rows.push(buildHttpFailureRow(entry.check, entry.route, reason));
    }
  }

  return rows;
}
