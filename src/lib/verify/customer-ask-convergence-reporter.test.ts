import { describe, expect, test } from "bun:test";
import {
  CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
  formatCustomerAskConvergenceLine,
  formatCustomerAskConvergenceReport,
  getCustomerAskConvergenceExitCode,
  hasCustomerAskConvergenceFailure,
  printCustomerAskConvergenceReport,
} from "./customer-ask-convergence-reporter";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

const PASS_ROW: CustomerAskConvergenceRow = {
  checkId: "home.header-search-entry",
  title: "Home exposes header-only search entry",
  status: "pass",
  route: "/",
  checklistRow: "phase-1-home-header-polish",
};

const UNCERTAIN_ROW: CustomerAskConvergenceRow = {
  checkId: "home.command-k-hover-contrast",
  title: "Command-K shortcut hover contrast is readable",
  status: "uncertain",
  reason: "hover color not observable from static HTML",
  checklistRow: "phase-1-home-header-polish",
};

const FAIL_ROW: CustomerAskConvergenceRow = {
  checkId: "tags.grouped-list-spacing",
  title: "Tag grouped lists avoid mt-8 flex gap-8 spacing",
  status: "fail",
  route: "/tags",
  reason: "grouped list still uses mt-8 flex flex-col gap-8",
  checklistRow: "phase-1-tag-list-styling",
};

describe("formatCustomerAskConvergenceLine", () => {
  test("formats pass rows with route and checklist reference", () => {
    expect(formatCustomerAskConvergenceLine(PASS_ROW)).toBe(
      "[PASS] home.header-search-entry — Home exposes header-only search entry (route=/) — checklistRow=phase-1-home-header-polish",
    );
  });

  test("formats uncertain rows with reason", () => {
    expect(formatCustomerAskConvergenceLine(UNCERTAIN_ROW)).toBe(
      "[UNCERTAIN] home.command-k-hover-contrast — Command-K shortcut hover contrast is readable — hover color not observable from static HTML — checklistRow=phase-1-home-header-polish",
    );
  });

  test("formats fail rows with route, reason, and checklist reference", () => {
    expect(formatCustomerAskConvergenceLine(FAIL_ROW)).toBe(
      "[FAIL] tags.grouped-list-spacing — Tag grouped lists avoid mt-8 flex gap-8 spacing (route=/tags) — grouped list still uses mt-8 flex flex-col gap-8 — checklistRow=phase-1-tag-list-styling",
    );
  });
});

describe("formatCustomerAskConvergenceReport", () => {
  test("includes header and one line per row in order", () => {
    const report = formatCustomerAskConvergenceReport([
      PASS_ROW,
      UNCERTAIN_ROW,
      FAIL_ROW,
    ]);
    expect(
      report.startsWith(`${CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER}\n`),
    ).toBe(true);
    expect(report).toContain(formatCustomerAskConvergenceLine(PASS_ROW));
    expect(report).toContain(formatCustomerAskConvergenceLine(UNCERTAIN_ROW));
    expect(report).toContain(formatCustomerAskConvergenceLine(FAIL_ROW));
  });
});

describe("customer-ask convergence exit semantics", () => {
  test("all-pass rows exit zero and are not treated as failures", () => {
    const rows = [PASS_ROW, { ...PASS_ROW, checkId: "tags.list-disc" }];
    expect(hasCustomerAskConvergenceFailure(rows)).toBe(false);
    expect(getCustomerAskConvergenceExitCode(rows)).toBe(0);
    expect(
      printCustomerAskConvergenceReport(rows, { writeLine: () => {} }),
    ).toBe(0);
  });

  test("uncertain-only rows exit zero", () => {
    const rows = [
      UNCERTAIN_ROW,
      { ...UNCERTAIN_ROW, checkId: "glossary.footer-hover" },
    ];
    expect(hasCustomerAskConvergenceFailure(rows)).toBe(false);
    expect(getCustomerAskConvergenceExitCode(rows)).toBe(0);
    expect(
      printCustomerAskConvergenceReport(rows, { writeLine: () => {} }),
    ).toBe(0);
  });

  test("mixed fail rows exit non-zero", () => {
    const rows = [PASS_ROW, UNCERTAIN_ROW, FAIL_ROW];
    expect(hasCustomerAskConvergenceFailure(rows)).toBe(true);
    expect(getCustomerAskConvergenceExitCode(rows)).toBe(1);
    expect(
      printCustomerAskConvergenceReport(rows, { writeLine: () => {} }),
    ).toBe(1);
  });
});

describe("printCustomerAskConvergenceReport", () => {
  test("writes header and each formatted row", () => {
    const lines: string[] = [];
    printCustomerAskConvergenceReport([PASS_ROW, FAIL_ROW], {
      writeLine: (line) => lines.push(line),
    });
    expect(lines).toEqual([
      CUSTOMER_ASK_CONVERGENCE_REPORT_HEADER,
      formatCustomerAskConvergenceLine(PASS_ROW),
      formatCustomerAskConvergenceLine(FAIL_ROW),
    ]);
  });
});
