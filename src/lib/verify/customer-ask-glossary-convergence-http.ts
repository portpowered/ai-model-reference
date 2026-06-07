import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  buildCustomerAskGlossaryBridgeDescriptionRows,
  buildCustomerAskGlossaryRows,
  GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  GLOSSARY_CUSTOMER_ASK_CHECKS,
  GLOSSARY_CUSTOMER_ASK_ROUTE,
  GLOSSARY_EMBEDDING_ROUTE,
  GLOSSARY_HIDDEN_SIZE_ROUTE,
  GLOSSARY_VECTOR_ROUTE,
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

const TOKEN_CHECKS = [
  GLOSSARY_CUSTOMER_ASK_CHECKS.presentation,
  GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks,
  GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover,
] as const;

const BRIDGE_DESCRIPTION_CHECKS = [
  GLOSSARY_CUSTOMER_ASK_CHECKS.embeddingDescriptionLinks,
  GLOSSARY_CUSTOMER_ASK_CHECKS.vectorDescriptionLinks,
  GLOSSARY_CUSTOMER_ASK_CHECKS.hiddenSizeDescriptionLinks,
] as const;

const BRIDGE_DESCRIPTION_ROUTES = [
  GLOSSARY_EMBEDDING_ROUTE,
  GLOSSARY_VECTOR_ROUTE,
  GLOSSARY_HIDDEN_SIZE_ROUTE,
] as const;

function buildTokenHttpFailureRows(
  reason: string,
): CustomerAskConvergenceRow[] {
  return TOKEN_CHECKS.map((check) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: GLOSSARY_CUSTOMER_ASK_ROUTE,
    reason,
    checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  }));
}

function buildBridgeHttpFailureRows(
  reason: string,
): CustomerAskConvergenceRow[] {
  return BRIDGE_DESCRIPTION_CHECKS.map((check, index) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: BRIDGE_DESCRIPTION_ROUTES[index] ?? GLOSSARY_EMBEDDING_ROUTE,
    reason,
    checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  }));
}

async function fetchRouteHtml(
  baseUrl: string,
  route: string,
  timeoutMs: number,
): Promise<{ status: number; body: string }> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const url = `${normalizedBase}${route}`;
  const { status, body } = await httpGetText(url, timeoutMs);
  return { status, body };
}

async function runCustomerAskGlossaryTokenChecks(
  baseUrl: string,
  timeoutMs: number,
): Promise<CustomerAskConvergenceRow[]> {
  try {
    const { status, body } = await fetchRouteHtml(
      baseUrl,
      GLOSSARY_CUSTOMER_ASK_ROUTE,
      timeoutMs,
    );
    if (status !== 200) {
      return buildTokenHttpFailureRows(
        `expected HTTP 200, received HTTP ${status}`,
      );
    }
    return buildCustomerAskGlossaryRows(body);
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return buildTokenHttpFailureRows(reason);
  }
}

async function runCustomerAskGlossaryBridgeDescriptionChecks(
  baseUrl: string,
  timeoutMs: number,
): Promise<CustomerAskConvergenceRow[]> {
  try {
    const [embedding, vector, hiddenSize] = await Promise.all([
      fetchRouteHtml(baseUrl, GLOSSARY_EMBEDDING_ROUTE, timeoutMs),
      fetchRouteHtml(baseUrl, GLOSSARY_VECTOR_ROUTE, timeoutMs),
      fetchRouteHtml(baseUrl, GLOSSARY_HIDDEN_SIZE_ROUTE, timeoutMs),
    ]);

    for (const response of [embedding, vector, hiddenSize]) {
      if (response.status !== 200) {
        return buildBridgeHttpFailureRows(
          `expected HTTP 200, received HTTP ${response.status}`,
        );
      }
    }

    return buildCustomerAskGlossaryBridgeDescriptionRows({
      embeddingHtml: embedding.body,
      vectorHtml: vector.body,
      hiddenSizeHtml: hiddenSize.body,
    });
  } catch (error) {
    const reason =
      error instanceof FetchTimeoutError
        ? `request timed out after ${error.timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return buildBridgeHttpFailureRows(reason);
  }
}

/**
 * Fetches built glossary routes and returns customer-ask glossary convergence
 * rows for token polish plus bridge description inline-link evidence.
 */
export async function runCustomerAskGlossaryChecks(
  baseUrl: string,
  options: RunCustomerAskGlossaryChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const [tokenRows, bridgeRows] = await Promise.all([
    runCustomerAskGlossaryTokenChecks(baseUrl, timeoutMs),
    runCustomerAskGlossaryBridgeDescriptionChecks(baseUrl, timeoutMs),
  ]);

  return [...tokenRows, ...bridgeRows];
}
