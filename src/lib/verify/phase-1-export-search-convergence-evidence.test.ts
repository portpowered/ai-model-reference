import { describe, expect, test } from "bun:test";
import {
  applyExportSearchShellGateToStaticRegressionRows,
  buildExportSearchHydrationCheckRow,
  buildExportSearchShellCheckRow,
  deriveExportSearchConvergenceRows,
  EXPORT_SEARCH_HYDRATION_CHECK_ID,
  EXPORT_SEARCH_HYDRATION_SURFACE,
  EXPORT_SEARCH_SHELL_CHECK_ID,
  formatExportSearchHydrationFailureReason,
  formatExportSearchShellUpstreamSkipReason,
  mergeExportSearchConvergenceRows,
} from "./phase-1-export-search-convergence-evidence";
import {
  STATIC_REGRESSION_CHECKLIST_ROW,
  STATIC_REGRESSION_CHECKS,
} from "./phase-1-github-pages-static-regression";
import { SEARCH_PAGE_INPUT_HTML_MARKER } from "./phase-1-search-export-shell-checks";

describe("deriveExportSearchConvergenceRows", () => {
  test("returns pass shell and hydration rows when shell gate and probes pass", () => {
    const rows = deriveExportSearchConvergenceRows({
      shellGate: { ok: true },
      hydrationProbes: [
        { query: "GQA" },
        { query: "attention" },
        { query: "KV cache" },
      ],
    });

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      checkId: EXPORT_SEARCH_SHELL_CHECK_ID,
      status: "pass",
      route: "/search",
    });
    expect(
      rows
        .slice(1)
        .every(
          (row) =>
            row.checkId === EXPORT_SEARCH_HYDRATION_CHECK_ID &&
            row.status === "pass",
        ),
    ).toBe(true);
  });

  test("returns failing shell row with route-shell reason when input shell is missing", () => {
    const shellReason = `missing expected content: ${SEARCH_PAGE_INPUT_HTML_MARKER}`;
    const rows = deriveExportSearchConvergenceRows({
      shellGate: { ok: false, reason: shellReason },
    });

    expect(rows[0]?.status).toBe("fail");
    expect(rows[0]?.checkId).toBe(EXPORT_SEARCH_SHELL_CHECK_ID);
    expect(rows[0]?.reason).toContain("route-shell");
    expect(rows[0]?.reason).toContain(SEARCH_PAGE_INPUT_HTML_MARKER);

    const hydrationRows = rows.slice(1);
    expect(hydrationRows).toHaveLength(3);
    expect(hydrationRows.every((row) => row.status === "uncertain")).toBe(true);
    expect(hydrationRows[0]?.reason).toContain("skipped");
    expect(hydrationRows[0]?.reason).toContain(shellReason);
  });

  test("returns hydration fail rows with query and DOM outcome when shell passes", () => {
    const domOutcome =
      "search input did not retain focus after typing on /search";
    const rows = deriveExportSearchConvergenceRows({
      shellGate: { ok: true },
      hydrationProbes: [{ query: "GQA", reason: domOutcome }],
      queries: ["GQA"],
    });

    const hydrationRow = rows.find(
      (row) => row.checkId === EXPORT_SEARCH_HYDRATION_CHECK_ID,
    );
    expect(hydrationRow?.status).toBe("fail");
    expect(hydrationRow?.query).toBe("GQA");
    expect(hydrationRow?.reason).toBe(
      formatExportSearchHydrationFailureReason("GQA", domOutcome),
    );
    expect(hydrationRow?.reason).toContain(EXPORT_SEARCH_HYDRATION_SURFACE);
  });
});

describe("buildExportSearchShellCheckRow", () => {
  test("labels shell failures with route-shell surface wording", () => {
    const row = buildExportSearchShellCheckRow({
      ok: false,
      reason: "missing search state region: expected idle marker",
    });

    expect(row.reason).toContain("route-shell");
    expect(row.reason).toContain("missing state region");
  });
});

describe("applyExportSearchShellGateToStaticRegressionRows", () => {
  test("downgrades search probe timeout rows to uncertain with upstream shell reason", () => {
    const shellReason = `missing expected content: ${SEARCH_PAGE_INPUT_HTML_MARKER}`;
    const adjusted = applyExportSearchShellGateToStaticRegressionRows(
      [
        {
          checkId: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
          title: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.title,
          status: "fail",
          route: "/search",
          query: "GQA",
          reason: "search input did not hydrate on /search within 45000ms",
          checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
        },
        {
          checkId: STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.checkId,
          title: STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.title,
          status: "pass",
          route: "/",
          checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
        },
      ],
      { ok: false, reason: shellReason },
    );

    expect(adjusted[0]?.status).toBe("uncertain");
    expect(adjusted[0]?.reason).toBe(
      formatExportSearchShellUpstreamSkipReason(shellReason),
    );
    expect(adjusted[1]?.status).toBe("pass");
  });
});

describe("mergeExportSearchConvergenceRows", () => {
  test("prepends classification rows ahead of adjusted probe rows", () => {
    const shellReason = `missing expected content: ${SEARCH_PAGE_INPUT_HTML_MARKER}`;
    const merged = mergeExportSearchConvergenceRows(
      [
        {
          checkId: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
          title: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.title,
          status: "fail",
          route: "/search",
          query: "GQA",
          reason: "timed out waiting for search results on /search",
          checklistRow: STATIC_REGRESSION_CHECKLIST_ROW,
        },
      ],
      {
        shellGate: { ok: false, reason: shellReason },
      },
    );

    expect(merged[0]?.checkId).toBe(EXPORT_SEARCH_SHELL_CHECK_ID);
    expect(merged[0]?.status).toBe("fail");
    expect(merged[1]?.checkId).toBe(EXPORT_SEARCH_HYDRATION_CHECK_ID);
    expect(merged[merged.length - 1]?.status).toBe("uncertain");
  });
});

describe("buildExportSearchHydrationCheckRow", () => {
  test("formats uncertain rows with explicit upstream shell skip reason", () => {
    const row = buildExportSearchHydrationCheckRow("attention", undefined, {
      uncertain: true,
      upstreamShellReason: "missing search state region",
    });

    expect(row.status).toBe("uncertain");
    expect(row.reason).toContain("skipped");
    expect(row.reason).toContain("missing search state region");
  });
});
