/** Planner-facing outcome for one customer-ask convergence check. */
export type CustomerAskConvergenceStatus = "pass" | "fail" | "uncertain";

/**
 * One row in the customer-ask convergence report. Stable `checkId` values are
 * documented for planner loopback in factory/docs/phase-1-customer-ask-convergence-validator.md.
 */
export type CustomerAskConvergenceRow = {
  /** Stable identifier for the check (for example `home.header-search-entry`). */
  checkId: string;
  /** Short human title shown in the convergence report. */
  title: string;
  status: CustomerAskConvergenceStatus;
  /** Route path exercised by the check, when applicable. */
  route?: string;
  /** Search query exercised by the check, when applicable. */
  query?: string;
  /** Failure or uncertain explanation; omitted on pass. */
  reason?: string;
  /** Reference into docs/temp/checklist.md or customer-ask inventory rows. */
  checklistRow: string;
};
