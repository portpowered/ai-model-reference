import {
  BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS,
  buildBatch011FollowUpCustomerAskReportSlots,
} from "./batch-011-follow-up-customer-ask-check-inventory";
import {
  BATCH_012_CUSTOMER_ASK_CHECK_IDS,
  buildBatch012CustomerAskReportSlots,
} from "./batch-012-customer-ask-check-inventory";
import { CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER } from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

export type Phase1CustomerAskReportSlot = {
  checkId: string;
  route?: string;
  query?: string;
};

/**
 * Ordered report slots for the expanded Phase 1 customer-ask inventory: retained
 * batch-008 and batch-011 follow-up rows followed by batch-012 rows.
 */
export function buildPhase1CustomerAskReportSlots(): readonly Phase1CustomerAskReportSlot[] {
  return [
    ...buildBatch011FollowUpCustomerAskReportSlots().map((slot) => ({
      checkId: slot.checkId,
      query: slot.query,
    })),
    ...buildBatch012CustomerAskReportSlots(),
  ];
}

/**
 * Ordered check ids emitted by the expanded customer-ask convergence report.
 */
export const PHASE_1_CUSTOMER_ASK_CHECK_IDS = [
  ...BATCH_011_FOLLOW_UP_CUSTOMER_ASK_CHECK_IDS,
  ...BATCH_012_CUSTOMER_ASK_CHECK_IDS,
] as const;

function rowMatchesReportSlot(
  row: CustomerAskConvergenceRow,
  slot: Phase1CustomerAskReportSlot,
): boolean {
  if (row.checkId !== slot.checkId) {
    return false;
  }

  if (slot.route !== undefined && row.route !== slot.route) {
    return false;
  }

  if (slot.query === undefined) {
    return row.query === undefined;
  }

  return row.query === slot.query;
}

function formatReportSlot(slot: Phase1CustomerAskReportSlot): string {
  const parts = [slot.checkId];
  if (slot.route !== undefined) {
    parts.push(`route=${slot.route}`);
  }
  if (slot.query !== undefined) {
    parts.push(`query=${slot.query}`);
  }
  return parts.join(" ");
}

/**
 * Orders customer-ask rows to match the expanded Phase 1 inventory and throws when
 * any required slot is missing or extra rows remain.
 */
export function orderCustomerAskRowsByPhase1CustomerAskInventory(
  rows: readonly CustomerAskConvergenceRow[],
): CustomerAskConvergenceRow[] {
  const slots = buildPhase1CustomerAskReportSlots();
  const pool = [...rows];
  const ordered: CustomerAskConvergenceRow[] = [];

  for (const slot of slots) {
    const index = pool.findIndex((row) => rowMatchesReportSlot(row, slot));
    if (index === -1) {
      throw new Error(
        `Missing customer-ask row for Phase 1 inventory slot ${formatReportSlot(slot)}`,
      );
    }
    ordered.push(pool.splice(index, 1)[0]);
  }

  if (pool.length > 0) {
    throw new Error(
      `Unexpected extra customer-ask rows outside Phase 1 inventory: ${pool.map((row) => formatReportSlot({ checkId: row.checkId, route: row.route, query: row.query })).join(", ")}`,
    );
  }

  return ordered;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts captured verifier output includes the expanded Phase 1 inventory with
 * no failing rows and only documented uncertain statuses.
 */
export function assertPhase1CustomerAskReportAllPassOrUncertain(
  output: string,
): void {
  if (!output.includes(CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER)) {
    throw new Error(
      "Expected customer-ask convergence report header in verifier output",
    );
  }

  if (/\[FAIL\]/.test(output)) {
    throw new Error(
      "Expected no [FAIL] rows in customer-ask convergence report",
    );
  }

  for (const checkId of PHASE_1_CUSTOMER_ASK_CHECK_IDS) {
    const passPattern = new RegExp(`\\[PASS\\] ${escapeRegExp(checkId)} —`);
    const uncertainPattern = new RegExp(
      `\\[UNCERTAIN\\] ${escapeRegExp(checkId)} —`,
    );
    if (!passPattern.test(output) && !uncertainPattern.test(output)) {
      throw new Error(
        `Expected [PASS] or [UNCERTAIN] row for Phase 1 checkId ${checkId} in verifier output`,
      );
    }
  }
}
