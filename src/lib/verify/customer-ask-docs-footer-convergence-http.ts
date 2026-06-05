import { readBundledAppCss } from "./bundled-app-css";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import { CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS } from "./customer-ask-convergence-stub-fixtures";
import {
  buildCustomerAskDocsFooterRows,
  DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
  DOCS_FOOTER_CUSTOMER_ASK_CHECKS,
  DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-docs-footer-convergence";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type RunCustomerAskDocsFooterChecksOptions = {
  timeoutMs?: number;
  projectRoot?: string;
  readBundledAppCss?: (projectRoot: string) => string | null;
};

export const VERIFY_DOCS_FOOTER_STUB_ENV = "VERIFY_DOCS_FOOTER_STUB";

/**
 * Test-only stub hook: VERIFY_DOCS_FOOTER_STUB=pass supplies bundled CSS when the
 * base URL is a static HTTP fixture and `.next` artifacts are absent (CI test runs).
 */
export function resolveCustomerAskDocsFooterCheckOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): RunCustomerAskDocsFooterChecksOptions {
  const stub = env[VERIFY_DOCS_FOOTER_STUB_ENV]?.trim();
  if (stub === "pass") {
    return {
      readBundledAppCss: () => CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS,
    };
  }
  return {};
}

const DOCS_FOOTER_CHECKS = [
  DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity,
] as const;

function buildHttpFailureRows(reason: string): CustomerAskConvergenceRow[] {
  return DOCS_FOOTER_CHECKS.map((check) => ({
    checkId: check.checkId,
    title: check.title,
    status: "fail" as const,
    route: DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
    reason,
    checklistRow: DOCS_FOOTER_CUSTOMER_ASK_CHECKLIST_ROW,
  }));
}

/**
 * Fetches canonical docs footer route HTML, reads bundled app CSS, and returns
 * customer-ask docs footer hover/focus parity rows.
 */
export async function runCustomerAskDocsFooterChecks(
  baseUrl: string,
  options: RunCustomerAskDocsFooterChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const projectRoot = options.projectRoot ?? process.cwd();
  const readCss = options.readBundledAppCss ?? readBundledAppCss;
  const url = `${normalizedBase}${DOCS_FOOTER_CUSTOMER_ASK_ROUTE}`;

  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return buildHttpFailureRows(`expected HTTP 200, received HTTP ${status}`);
    }

    return buildCustomerAskDocsFooterRows(body, readCss(projectRoot));
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
