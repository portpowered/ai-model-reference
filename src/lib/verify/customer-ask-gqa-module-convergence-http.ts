import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskGqaModuleRows,
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
  GQA_MODULE_CUSTOMER_ASK_CHECKS,
  GQA_MODULE_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-gqa-module-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskGqaModuleChecksOptions = {
  timeoutMs?: number;
};

const GQA_MODULE_CHECKS = [
  GQA_MODULE_CUSTOMER_ASK_CHECKS.presentation,
  GQA_MODULE_CUSTOMER_ASK_CHECKS.listDisc,
  GQA_MODULE_CUSTOMER_ASK_CHECKS.mhaGqaComparison,
] as const;

function buildHttpFailureRows(reason: string): CustomerAskConvergenceRow[] {
  return GQA_MODULE_CHECKS.map((check) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: GQA_MODULE_CUSTOMER_ASK_ROUTE,
    reason,
    checklistRow: GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
  }));
}

/**
 * Fetches built `/docs/modules/grouped-query-attention` HTML and returns
 * customer-ask GQA module page convergence rows.
 */
export async function runCustomerAskGqaModuleChecks(
  baseUrl: string,
  options: RunCustomerAskGqaModuleChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const url = `${normalizedBase}${GQA_MODULE_CUSTOMER_ASK_ROUTE}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return buildHttpFailureRows(`expected HTTP 200, received HTTP ${status}`);
    }
    return buildCustomerAskGqaModuleRows(body);
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
