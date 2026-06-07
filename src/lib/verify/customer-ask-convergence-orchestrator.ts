import {
  CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
  getCustomerAskConvergenceExitCode,
  type PrintCustomerAskConvergenceReportOptions,
  printCustomerAskConvergenceReport,
} from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  type RunCustomerAskDocsFooterChecksOptions,
  runCustomerAskDocsFooterChecks,
} from "./customer-ask-docs-footer-convergence-http";
import {
  type RunCustomerAskGlossaryChecksOptions,
  runCustomerAskGlossaryChecks,
} from "./customer-ask-glossary-convergence-http";
import {
  type RunCustomerAskGlossaryPageChecksOptions,
  runCustomerAskGlossaryPageChecks,
} from "./customer-ask-glossary-page-convergence-http";
import {
  type RunCustomerAskGqaModuleChecksOptions,
  runCustomerAskGqaModuleChecks,
} from "./customer-ask-gqa-module-convergence-http";
import {
  type RunCustomerAskGqaModuleDeduplicationChecksOptions,
  runCustomerAskGqaModuleDeduplicationChecks,
} from "./customer-ask-gqa-module-deduplication-convergence-http";
import {
  type RunCustomerAskGqaModuleGraphMathChecksOptions,
  runCustomerAskGqaModuleGraphMathChecks,
} from "./customer-ask-gqa-module-graph-math-convergence-http";
import {
  type RunCustomerAskHomeHeaderChecksOptions,
  runCustomerAskHomeHeaderChecks,
} from "./customer-ask-home-header-convergence-http";
import {
  type RunCustomerAskHomeNavFollowUpChecksOptions,
  runCustomerAskHomeNavFollowUpChecks,
} from "./customer-ask-home-nav-follow-up-convergence-http";
import {
  type RunCustomerAskMissingPagesChecksOptions,
  runCustomerAskMissingPagesChecks,
} from "./customer-ask-missing-pages-convergence-http";
import {
  type RunCustomerAskMobileHeaderChecksOptions,
  runCustomerAskMobileHeaderChecks,
} from "./customer-ask-mobile-header-convergence-http";
import {
  type RunCustomerAskSearchSurfaceChecksOptions,
  runCustomerAskSearchSurfaceChecks,
} from "./customer-ask-search-surface-convergence-http";
import {
  type RunCustomerAskTagListChecksOptions,
  runCustomerAskTagListChecks,
} from "./customer-ask-tag-list-convergence-http";
import {
  type RunCustomerAskTagSearchDecorationChecksOptions,
  runCustomerAskTagSearchDecorationChecks,
} from "./customer-ask-tag-search-decoration-convergence-http";
import { orderCustomerAskRowsByPhase1CustomerAskInventory } from "./phase-1-customer-ask-check-inventory";
import {
  PHASE_1_UX_SUCCESS_MESSAGE,
  type RunPhase1UxVerificationOptions,
  runPhase1UxVerification,
} from "./phase-1-ux-verifier";

export type RunCustomerAskConvergenceChecksOptions = {
  timeoutMs?: number;
  homeHeaderOptions?: RunCustomerAskHomeHeaderChecksOptions;
  homeNavFollowUpOptions?: RunCustomerAskHomeNavFollowUpChecksOptions;
  mobileHeaderOptions?: RunCustomerAskMobileHeaderChecksOptions;
  tagListOptions?: RunCustomerAskTagListChecksOptions;
  tagSearchDecorationOptions?: RunCustomerAskTagSearchDecorationChecksOptions;
  searchSurfaceOptions?: RunCustomerAskSearchSurfaceChecksOptions;
  glossaryOptions?: RunCustomerAskGlossaryChecksOptions;
  glossaryPageOptions?: RunCustomerAskGlossaryPageChecksOptions;
  missingPagesOptions?: RunCustomerAskMissingPagesChecksOptions;
  docsFooterOptions?: RunCustomerAskDocsFooterChecksOptions;
  gqaModuleOptions?: RunCustomerAskGqaModuleChecksOptions;
  gqaModuleDeduplicationOptions?: RunCustomerAskGqaModuleDeduplicationChecksOptions;
  gqaModuleGraphMathOptions?: RunCustomerAskGqaModuleGraphMathChecksOptions;
};

/**
 * Runs all customer-ask convergence modules against a built-app base URL and
 * returns aggregated planner rows (batch-008, batch-011 follow-up, and batch-012).
 */
export async function runCustomerAskConvergenceChecks(
  baseUrl: string,
  options: RunCustomerAskConvergenceChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const timeoutMs = options.timeoutMs;
  const sharedTimeout = timeoutMs !== undefined ? { timeoutMs } : {};

  const [
    homeHeaderRows,
    homeNavFollowUpRows,
    mobileHeaderRows,
    tagListRows,
    tagSearchDecorationRows,
    searchSurfaceRows,
    glossaryRows,
    glossaryPageRows,
    missingPagesRows,
    docsFooterRows,
    gqaModuleRows,
    gqaModuleDeduplicationRows,
    gqaModuleGraphMathRows,
  ] = await Promise.all([
    runCustomerAskHomeHeaderChecks(baseUrl, {
      ...sharedTimeout,
      ...options.homeHeaderOptions,
    }),
    runCustomerAskHomeNavFollowUpChecks(baseUrl, {
      ...sharedTimeout,
      ...options.homeNavFollowUpOptions,
    }),
    runCustomerAskMobileHeaderChecks(baseUrl, {
      ...sharedTimeout,
      ...options.mobileHeaderOptions,
    }),
    runCustomerAskTagListChecks(baseUrl, {
      ...sharedTimeout,
      ...options.tagListOptions,
    }),
    runCustomerAskTagSearchDecorationChecks(baseUrl, {
      ...sharedTimeout,
      ...options.tagSearchDecorationOptions,
    }),
    runCustomerAskSearchSurfaceChecks(baseUrl, {
      ...sharedTimeout,
      ...options.searchSurfaceOptions,
    }),
    runCustomerAskGlossaryChecks(baseUrl, {
      ...sharedTimeout,
      ...options.glossaryOptions,
    }),
    runCustomerAskGlossaryPageChecks(baseUrl, {
      ...sharedTimeout,
      ...options.glossaryPageOptions,
    }),
    runCustomerAskMissingPagesChecks(baseUrl, {
      ...sharedTimeout,
      ...options.missingPagesOptions,
    }),
    runCustomerAskDocsFooterChecks(baseUrl, {
      ...sharedTimeout,
      ...options.docsFooterOptions,
    }),
    runCustomerAskGqaModuleChecks(baseUrl, {
      ...sharedTimeout,
      ...options.gqaModuleOptions,
    }),
    runCustomerAskGqaModuleDeduplicationChecks(baseUrl, {
      ...sharedTimeout,
      ...options.gqaModuleDeduplicationOptions,
    }),
    runCustomerAskGqaModuleGraphMathChecks(baseUrl, {
      ...sharedTimeout,
      ...options.gqaModuleGraphMathOptions,
    }),
  ]);

  return orderCustomerAskRowsByPhase1CustomerAskInventory([
    ...homeHeaderRows,
    ...homeNavFollowUpRows,
    ...mobileHeaderRows,
    ...tagListRows,
    ...tagSearchDecorationRows,
    ...searchSurfaceRows,
    ...glossaryRows,
    ...glossaryPageRows,
    ...missingPagesRows,
    ...docsFooterRows,
    ...gqaModuleRows,
    ...gqaModuleDeduplicationRows,
    ...gqaModuleGraphMathRows,
  ]);
}

export type RunPhase1CustomerAskConvergenceVerificationOptions = {
  phase1UxOptions?: RunPhase1UxVerificationOptions;
  customerAskOptions?: RunCustomerAskConvergenceChecksOptions;
  printReport?: PrintCustomerAskConvergenceReportOptions;
};

export type Phase1CustomerAskConvergenceVerificationResult = {
  customerAskRows: CustomerAskConvergenceRow[];
  customerAskExitCode: 0 | 1;
  phase1UxPassed: boolean;
};

/**
 * Runs legacy Phase 1 UX verification, then customer-ask modules, prints the
 * structured customer-ask report, and returns exit metadata for the CLI.
 */
export async function runPhase1CustomerAskConvergenceVerification(
  baseUrl: string,
  options: RunPhase1CustomerAskConvergenceVerificationOptions = {},
): Promise<Phase1CustomerAskConvergenceVerificationResult> {
  let phase1UxPassed = true;
  try {
    await runPhase1UxVerification(baseUrl, options.phase1UxOptions);
  } catch {
    phase1UxPassed = false;
  }

  const customerAskRows = await runCustomerAskConvergenceChecks(
    baseUrl,
    options.customerAskOptions,
  );
  const customerAskExitCode = printCustomerAskConvergenceReport(
    customerAskRows,
    options.printReport,
  );

  return {
    customerAskRows,
    customerAskExitCode,
    phase1UxPassed,
  };
}

export {
  CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
  getCustomerAskConvergenceExitCode,
  PHASE_1_UX_SUCCESS_MESSAGE,
};
