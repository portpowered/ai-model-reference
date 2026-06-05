import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

export const CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER =
  "Customer-ask convergence report";

/**
 * Returns true when any row failed. Uncertain rows are non-blocking.
 */
export function hasCustomerAskConvergenceFailure(
  rows: readonly CustomerAskConvergenceRow[],
): boolean {
  return rows.some((row) => row.status === "fail");
}

/**
 * Exit code 1 when any row is `fail`; 0 when all rows are `pass` or `uncertain`.
 */
export function getCustomerAskConvergenceExitCode(
  rows: readonly CustomerAskConvergenceRow[],
): 0 | 1 {
  return hasCustomerAskConvergenceFailure(rows) ? 1 : 0;
}

function formatLocationSuffix(row: CustomerAskConvergenceRow): string {
  const parts: string[] = [];
  if (row.route) {
    parts.push(`route=${row.route}`);
  }
  if (row.query) {
    parts.push(`query=${row.query}`);
  }
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

/**
 * One human-readable summary line per check for planner review.
 */
export function formatCustomerAskConvergenceLine(
  row: CustomerAskConvergenceRow,
): string {
  const status = row.status.toUpperCase();
  const location = formatLocationSuffix(row);
  const reason = row.reason && row.status !== "pass" ? ` — ${row.reason}` : "";
  return `[${status}] ${row.checkId} — ${row.title}${location}${reason} — checklistRow=${row.checklistRow}`;
}

/**
 * Full multi-line report body (header plus one line per row).
 */
export function formatCustomerAskConvergenceReport(
  rows: readonly CustomerAskConvergenceRow[],
): string {
  const lines = rows.map((row) => formatCustomerAskConvergenceLine(row));
  return [CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER, ...lines].join("\n");
}

export type PrintCustomerAskConvergenceReportOptions = {
  /** Defaults to process.stdout. */
  writeLine?: (line: string) => void;
};

/**
 * Prints the structured report and returns the process exit code (1 on any fail).
 */
export function printCustomerAskConvergenceReport(
  rows: readonly CustomerAskConvergenceRow[],
  options: PrintCustomerAskConvergenceReportOptions = {},
): 0 | 1 {
  const writeLine = options.writeLine ?? ((line: string) => console.log(line));
  const report = formatCustomerAskConvergenceReport(rows);
  for (const line of report.split("\n")) {
    writeLine(line);
  }
  return getCustomerAskConvergenceExitCode(rows);
}
