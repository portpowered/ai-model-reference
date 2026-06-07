import {
  BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
  BATCH_013_GQA_MATH_CHECKLIST_ROW,
  BATCH_013_GQA_MODULE_CHECKS,
  BATCH_013_GQA_MODULE_ROUTE,
} from "./batch-013-gqa-module-checks";
import { buildBatch013GqaModuleGraphMathRows } from "./batch-013-gqa-module-graph-math-convergence";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunBatch013GqaModuleGraphMathChecksOptions = {
  timeoutMs?: number;
};

const BATCH_013_GQA_GRAPH_MATH_CHECKS = [
  {
    check: BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability,
    checklistRow: BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
  },
  {
    check: BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph,
    checklistRow: BATCH_013_GQA_GRAPH_CHECKLIST_ROW,
  },
  {
    check: BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions,
    checklistRow: BATCH_013_GQA_MATH_CHECKLIST_ROW,
  },
] as const;

function buildHttpFailureRows(reason: string): CustomerAskConvergenceRow[] {
  return BATCH_013_GQA_GRAPH_MATH_CHECKS.map(({ check, checklistRow }) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: BATCH_013_GQA_MODULE_ROUTE,
    reason,
    checklistRow,
  }));
}

/**
 * Fetches built `/docs/modules/grouped-query-attention` HTML and returns
 * batch-013 GQA module graph and math customer-ask rows.
 */
export async function runBatch013GqaModuleGraphMathChecks(
  baseUrl: string,
  options: RunBatch013GqaModuleGraphMathChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const url = `${normalizedBase}${BATCH_013_GQA_MODULE_ROUTE}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return buildHttpFailureRows(`expected HTTP 200, received HTTP ${status}`);
    }
    return buildBatch013GqaModuleGraphMathRows(body);
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
