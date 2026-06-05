import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskGlossaryRows,
  GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  GLOSSARY_CUSTOMER_ASK_CHECKS,
  GLOSSARY_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-glossary-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskGlossaryChecksOptions = {
  timeoutMs?: number;
};

const GLOSSARY_CHECKS = [
  GLOSSARY_CUSTOMER_ASK_CHECKS.presentation,
  GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks,
  GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover,
] as const;

function buildHttpFailureRows(reason: string): CustomerAskConvergenceRow[] {
  return GLOSSARY_CHECKS.map((check) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: GLOSSARY_CUSTOMER_ASK_ROUTE,
    reason,
    checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  }));
}

/**
 * Fetches built `/docs/glossary/token` HTML and returns customer-ask glossary
 * page convergence rows.
 */
export async function runCustomerAskGlossaryChecks(
  baseUrl: string,
  options: RunCustomerAskGlossaryChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const url = `${normalizedBase}${GLOSSARY_CUSTOMER_ASK_ROUTE}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return buildHttpFailureRows(`expected HTTP 200, received HTTP ${status}`);
    }
    return buildCustomerAskGlossaryRows(body);
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
