import {
  BATCH_013_GQA_MODULE_CHECKS,
  BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW,
  BATCH_013_GQA_MODULE_ROUTE,
} from "./batch-013-gqa-module-checks";
import { buildBatch013GqaModuleDeduplicationRows } from "./batch-013-gqa-module-deduplication-convergence";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunBatch013GqaModuleDeduplicationChecksOptions = {
  timeoutMs?: number;
};

const BATCH_013_GQA_DEDUP_CHECKS = [
  BATCH_013_GQA_MODULE_CHECKS.noDuplicateBodyHeading,
  BATCH_013_GQA_MODULE_CHECKS.noMetadataCard,
  BATCH_013_GQA_MODULE_CHECKS.singleTagList,
] as const;

function buildHttpFailureRows(reason: string): CustomerAskConvergenceRow[] {
  return BATCH_013_GQA_DEDUP_CHECKS.map((check) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: BATCH_013_GQA_MODULE_ROUTE,
    reason,
    checklistRow: BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW,
  }));
}

/**
 * Fetches built `/docs/modules/grouped-query-attention` HTML and returns
 * batch-013 GQA module deduplication customer-ask rows.
 */
export async function runBatch013GqaModuleDeduplicationChecks(
  baseUrl: string,
  options: RunBatch013GqaModuleDeduplicationChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const url = `${normalizedBase}${BATCH_013_GQA_MODULE_ROUTE}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return buildHttpFailureRows(`expected HTTP 200, received HTTP ${status}`);
    }
    return buildBatch013GqaModuleDeduplicationRows(body);
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return buildHttpFailureRows(reason);
  }
}
