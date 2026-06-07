import {
  BATCH_012_GQA_MODULE_CHECKLIST_ROW,
  BATCH_012_GQA_MODULE_CHECKS,
  BATCH_012_GQA_MODULE_ROUTE,
} from "./batch-012-gqa-module-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import { buildCustomerAskGqaModuleGraphMathRows } from "./customer-ask-gqa-module-graph-math-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskGqaModuleGraphMathChecksOptions = {
  timeoutMs?: number;
};

const GQA_MODULE_GRAPH_MATH_CHECKS = [
  BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability,
  BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph,
  BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions,
] as const;

function buildHttpFailureRows(reason: string): CustomerAskConvergenceRow[] {
  return GQA_MODULE_GRAPH_MATH_CHECKS.map((check) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: BATCH_012_GQA_MODULE_ROUTE,
    reason,
    checklistRow: BATCH_012_GQA_MODULE_CHECKLIST_ROW,
  }));
}

/**
 * Fetches built `/docs/modules/grouped-query-attention` HTML and returns
 * batch-012 GQA module graph and math customer-ask rows.
 */
export async function runCustomerAskGqaModuleGraphMathChecks(
  baseUrl: string,
  options: RunCustomerAskGqaModuleGraphMathChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const url = `${normalizedBase}${BATCH_012_GQA_MODULE_ROUTE}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return buildHttpFailureRows(`expected HTTP 200, received HTTP ${status}`);
    }
    return buildCustomerAskGqaModuleGraphMathRows(body);
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
