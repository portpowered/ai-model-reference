import {
  CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
  getCustomerAskConvergenceExitCode,
  type PrintCustomerAskConvergenceReportOptions,
  printCustomerAskConvergenceReport,
} from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  type RunCustomerAskGlossaryChecksOptions,
  runCustomerAskGlossaryChecks,
} from "./customer-ask-glossary-convergence-http";
import {
  type RunCustomerAskGqaModuleChecksOptions,
  runCustomerAskGqaModuleChecks,
} from "./customer-ask-gqa-module-convergence-http";
import {
  type RunCustomerAskHomeHeaderChecksOptions,
  runCustomerAskHomeHeaderChecks,
} from "./customer-ask-home-header-convergence-http";
import {
  type RunCustomerAskSearchSurfaceChecksOptions,
  runCustomerAskSearchSurfaceChecks,
} from "./customer-ask-search-surface-convergence-http";
import {
  type RunCustomerAskTagListChecksOptions,
  runCustomerAskTagListChecks,
} from "./customer-ask-tag-list-convergence-http";
import {
  PHASE_1_UX_SUCCESS_MESSAGE,
  type RunPhase1UxVerificationOptions,
  runPhase1UxVerification,
} from "./phase-1-ux-verifier";

export type RunCustomerAskConvergenceChecksOptions = {
  timeoutMs?: number;
  homeHeaderOptions?: RunCustomerAskHomeHeaderChecksOptions;
  tagListOptions?: RunCustomerAskTagListChecksOptions;
  searchSurfaceOptions?: RunCustomerAskSearchSurfaceChecksOptions;
  glossaryOptions?: RunCustomerAskGlossaryChecksOptions;
  gqaModuleOptions?: RunCustomerAskGqaModuleChecksOptions;
};

/**
 * Runs all customer-ask convergence modules against a built-app base URL and
 * returns aggregated planner rows (home/header, tags, search, glossary, GQA).
 */
export async function runCustomerAskConvergenceChecks(
  baseUrl: string,
  options: RunCustomerAskConvergenceChecksOptions = {},
): Promise<CustomerAskConvergenceRow[]> {
  const timeoutMs = options.timeoutMs;
  const sharedTimeout = timeoutMs !== undefined ? { timeoutMs } : {};

  const [
    homeHeaderRows,
    tagListRows,
    searchSurfaceRows,
    glossaryRows,
    gqaModuleRows,
  ] = await Promise.all([
    runCustomerAskHomeHeaderChecks(baseUrl, {
      ...sharedTimeout,
      ...options.homeHeaderOptions,
    }),
    runCustomerAskTagListChecks(baseUrl, {
      ...sharedTimeout,
      ...options.tagListOptions,
    }),
    runCustomerAskSearchSurfaceChecks(baseUrl, {
      ...sharedTimeout,
      ...options.searchSurfaceOptions,
    }),
    runCustomerAskGlossaryChecks(baseUrl, {
      ...sharedTimeout,
      ...options.glossaryOptions,
    }),
    runCustomerAskGqaModuleChecks(baseUrl, {
      ...sharedTimeout,
      ...options.gqaModuleOptions,
    }),
  ]);

  return [
    ...homeHeaderRows,
    ...tagListRows,
    ...searchSurfaceRows,
    ...glossaryRows,
    ...gqaModuleRows,
  ];
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
