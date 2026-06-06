import { describe, expect, test } from "bun:test";
import { BATCH_011_FOLLOW_UP_SEARCH_CHECKS } from "./batch-011-follow-up-search-checks";
import {
  assertSearchMatchedTextSelectionContrast,
  assertSearchRowHoverCoherence,
  buildCustomerAskSearchDialogFollowUpRowsForQuery,
  buildCustomerAskSearchPageFollowUpRowsForQuery,
  POST_REPAIR_SEARCH_RESULT_ROW_HTML,
  PRE_REPAIR_SEARCH_RESULT_ROW_DETACHED_META_HTML,
  PRE_REPAIR_SEARCH_RESULT_ROW_HTML,
  SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS,
} from "./customer-ask-search-follow-up-convergence";
import {
  SEARCH_SURFACE_CUSTOMER_ASK_REASONS,
  SEARCH_SURFACE_CUSTOMER_ASK_ROUTES,
  type SearchSurfaceResultSnapshot,
} from "./customer-ask-search-surface-convergence";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";

const GQA_URL = PHASE_1_GROUPED_QUERY_ATTENTION_URL;

function passingSnapshot(
  overrides: Partial<SearchSurfaceResultSnapshot> = {},
): SearchSurfaceResultSnapshot {
  return {
    resultUrls: [GQA_URL, "/docs/glossary/token"],
    matchedTagsVisible: false,
    hasResults: true,
    hasEmpty: false,
    firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
    ...overrides,
  };
}

describe("assertSearchRowHoverCoherence", () => {
  test("passes for post-repair first result row markup", () => {
    expect(assertSearchRowHoverCoherence(passingSnapshot(), "GQA")).toBeNull();
  });

  test("fails when first result row is missing group container classes", () => {
    expect(
      assertSearchRowHoverCoherence(
        passingSnapshot({
          firstResultRowHtml: PRE_REPAIR_SEARCH_RESULT_ROW_HTML,
        }),
        "attention",
      ),
    ).toBe(SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.rowMissingGroupClass);
  });

  test("fails when embedded metadata lacks accent hover classes", () => {
    const rowHtml = POST_REPAIR_SEARCH_RESULT_ROW_HTML.replace(
      'data-testid="search-result-meta"\n    class="space-y-0.5 text-sm pt-1 text-fd-muted-foreground group-hover:text-accent-foreground group-focus-visible:text-accent-foreground group-aria-selected:text-fd-accent-foreground"',
      'data-testid="search-result-meta"\n    class="space-y-0.5 text-sm pt-1 text-fd-muted-foreground"',
    );
    expect(
      assertSearchRowHoverCoherence(
        passingSnapshot({ firstResultRowHtml: rowHtml }),
        "KV cache",
      ),
    ).toBe(SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.metaMissingHoverCoherence);
  });

  test("fails when metadata fields keep fixed muted foreground classes", () => {
    expect(
      assertSearchRowHoverCoherence(
        passingSnapshot({
          firstResultRowHtml: PRE_REPAIR_SEARCH_RESULT_ROW_DETACHED_META_HTML,
        }),
        "GQA",
      ),
    ).toBe(SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.metaFieldMissingTextInherit);
  });

  test("fails when search results are unavailable", () => {
    expect(
      assertSearchRowHoverCoherence(
        {
          resultUrls: [],
          matchedTagsVisible: false,
          hasResults: false,
          hasEmpty: true,
        },
        "GQA",
      ),
    ).toContain(SEARCH_SURFACE_CUSTOMER_ASK_REASONS.emptySearchResults);
  });
});

describe("assertSearchMatchedTextSelectionContrast", () => {
  test("passes for post-repair query-match marks", () => {
    expect(
      assertSearchMatchedTextSelectionContrast(passingSnapshot(), "GQA"),
    ).toBeNull();
  });

  test("fails when query-match marks lack accent-safe selection classes", () => {
    expect(
      assertSearchMatchedTextSelectionContrast(
        passingSnapshot({
          firstResultRowHtml: PRE_REPAIR_SEARCH_RESULT_ROW_HTML,
        }),
        "GQA",
      ),
    ).toBe(
      SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.titleMarkMissingSelectionContrast,
    );
  });

  test("passes when the first row has no query-match marks", () => {
    const rowWithoutMarks = POST_REPAIR_SEARCH_RESULT_ROW_HTML.replace(
      /<mark[\s\S]*?<\/mark>/,
      "Grouped-Query Attention",
    );
    expect(
      assertSearchMatchedTextSelectionContrast(
        passingSnapshot({ firstResultRowHtml: rowWithoutMarks }),
        "attention",
      ),
    ).toBeNull();
  });

  test("fails when first result row markup is missing", () => {
    expect(
      assertSearchMatchedTextSelectionContrast(
        passingSnapshot({ firstResultRowHtml: null }),
        "GQA",
      ),
    ).toBe(SEARCH_FOLLOW_UP_CUSTOMER_ASK_REASONS.missingFirstResultRow);
  });
});

describe("buildCustomerAskSearchPageFollowUpRowsForQuery", () => {
  test("emits follow-up check ids with pass status for post-repair snapshots", () => {
    const rows = buildCustomerAskSearchPageFollowUpRowsForQuery(
      passingSnapshot(),
      "GQA",
    );

    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageRowHoverCoherence.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageMatchedTextSelectionContrast
        .checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(rows.every((row) => row.query === "GQA")).toBe(true);
    expect(
      rows.every(
        (row) => row.route === SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.searchPage,
      ),
    ).toBe(true);
    expect(
      rows.every((row) => row.checklistRow === "phase-1-search-surface"),
    ).toBe(true);
  });

  test("fails row hover and matched-text checks independently", () => {
    const hoverOnlyFail = buildCustomerAskSearchPageFollowUpRowsForQuery(
      passingSnapshot({
        firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML.replace(
          'class="group flex',
          'class="flex',
        ),
      }),
      "attention",
    );
    expect(hoverOnlyFail[0]?.status).toBe("fail");
    expect(hoverOnlyFail[1]?.status).toBe("pass");

    const contrastFail = buildCustomerAskSearchPageFollowUpRowsForQuery(
      passingSnapshot({
        firstResultRowHtml: PRE_REPAIR_SEARCH_RESULT_ROW_HTML,
      }),
      "KV cache",
    );
    expect(contrastFail[0]?.status).toBe("fail");
    expect(contrastFail[1]?.status).toBe("fail");
  });
});

describe("buildCustomerAskSearchDialogFollowUpRowsForQuery", () => {
  test("emits dialog follow-up rows for header search snapshots", () => {
    const rows = buildCustomerAskSearchDialogFollowUpRowsForQuery(
      passingSnapshot(),
      "GQA",
    );

    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogRowHoverCoherence.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogMatchedTextSelectionContrast
        .checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.every(
        (row) => row.route === SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.headerDialog,
      ),
    ).toBe(true);
  });
});
