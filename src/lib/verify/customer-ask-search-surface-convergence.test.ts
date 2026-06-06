import { describe, expect, test } from "bun:test";
import { BATCH_011_FOLLOW_UP_SEARCH_CHECKS } from "./batch-011-follow-up-search-checks";
import { POST_REPAIR_SEARCH_RESULT_ROW_HTML } from "./customer-ask-search-follow-up-convergence";
import {
  assertApiGqaCanonicalPageHit,
  assertSearchNoMatchedTags,
  assertSearchPageLevelHits,
  buildCustomerAskSearchApiGqaRow,
  buildCustomerAskSearchDialogRowsForQuery,
  buildCustomerAskSearchPageRowsForQuery,
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKS,
  SEARCH_SURFACE_CUSTOMER_ASK_QUERIES,
  SEARCH_SURFACE_CUSTOMER_ASK_REASONS,
  SEARCH_SURFACE_CUSTOMER_ASK_ROUTES,
  type SearchSurfaceResultSnapshot,
} from "./customer-ask-search-surface-convergence";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";

const GQA_URL = PHASE_1_GROUPED_QUERY_ATTENTION_URL;
const TOKEN_URL = "/docs/glossary/token";

function passingSnapshot(
  overrides: Partial<SearchSurfaceResultSnapshot> = {},
): SearchSurfaceResultSnapshot {
  return {
    resultUrls: [GQA_URL, TOKEN_URL],
    matchedTagsVisible: false,
    hasResults: true,
    hasEmpty: false,
    firstResultRowHtml: POST_REPAIR_SEARCH_RESULT_ROW_HTML,
    ...overrides,
  };
}

describe("SEARCH_SURFACE_CUSTOMER_ASK_QUERIES", () => {
  test("covers GQA, attention, and KV cache manual-gate queries", () => {
    expect([...SEARCH_SURFACE_CUSTOMER_ASK_QUERIES]).toEqual([
      "GQA",
      "attention",
      "KV cache",
    ]);
  });
});

describe("assertSearchPageLevelHits", () => {
  test("passes when first result is canonical and page URLs are unique", () => {
    expect(assertSearchPageLevelHits(passingSnapshot(), "GQA")).toBeNull();
  });

  test("fails when first visible result URL includes a hash fragment", () => {
    expect(
      assertSearchPageLevelHits(
        passingSnapshot({
          resultUrls: [`${GQA_URL}#compute-flow`, TOKEN_URL],
        }),
        "attention",
      ),
    ).toBe(SEARCH_SURFACE_CUSTOMER_ASK_REASONS.firstResultFragment);
  });

  test("fails when multiple rows duplicate one canonical page URL", () => {
    expect(
      assertSearchPageLevelHits(
        passingSnapshot({
          resultUrls: [GQA_URL, `${GQA_URL}#overview`, TOKEN_URL],
        }),
        "KV cache",
      ),
    ).toBe(SEARCH_SURFACE_CUSTOMER_ASK_REASONS.duplicatePageRows);
  });

  test("fails on empty-only search state", () => {
    const reason = assertSearchPageLevelHits(
      {
        resultUrls: [],
        matchedTagsVisible: false,
        hasResults: false,
        hasEmpty: true,
      },
      "GQA",
    );
    expect(reason).toContain(
      SEARCH_SURFACE_CUSTOMER_ASK_REASONS.emptySearchResults,
    );
  });
});

describe("assertSearchNoMatchedTags", () => {
  test("passes when matched-tag chips are absent", () => {
    expect(assertSearchNoMatchedTags(passingSnapshot())).toBeNull();
  });

  test("fails when search-result-matched-tags is visible", () => {
    expect(
      assertSearchNoMatchedTags(passingSnapshot({ matchedTagsVisible: true })),
    ).toBe(SEARCH_SURFACE_CUSTOMER_ASK_REASONS.matchedTagsVisible);
  });
});

describe("assertApiGqaCanonicalPageHit", () => {
  test("passes when canonical GQA page is first without fragment spam", () => {
    expect(
      assertApiGqaCanonicalPageHit([{ url: GQA_URL }, { url: TOKEN_URL }]),
    ).toBeNull();
  });

  test("fails when first GQA hit is a fragment deep link", () => {
    expect(
      assertApiGqaCanonicalPageHit([{ url: `${GQA_URL}#compute-flow` }]),
    ).toBe(SEARCH_SURFACE_CUSTOMER_ASK_REASONS.apiGqaFragmentSpam);
  });

  test("fails when canonical page is not ranked first", () => {
    const reason = assertApiGqaCanonicalPageHit([
      { url: TOKEN_URL },
      { url: GQA_URL },
    ]);
    expect(reason).toContain(GQA_URL);
  });

  test("fails when fragment rows duplicate the canonical page", () => {
    expect(
      assertApiGqaCanonicalPageHit([
        { url: GQA_URL },
        { url: `${GQA_URL}#overview` },
      ]),
    ).toBe(SEARCH_SURFACE_CUSTOMER_ASK_REASONS.apiGqaFragmentSpam);
  });
});

describe("buildCustomerAskSearchPageRowsForQuery", () => {
  test("maps passing snapshots to pass rows with checklist metadata", () => {
    const rows = buildCustomerAskSearchPageRowsForQuery(
      passingSnapshot(),
      "GQA",
    );

    expect(rows).toHaveLength(4);
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
    expect(rows.map((row) => row.checkId)).toEqual([
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pagePageLevelHits.checkId,
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.pageNoMatchedTags.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageRowHoverCoherence.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.pageMatchedTextSelectionContrast
        .checkId,
    ]);
  });
});

describe("buildCustomerAskSearchDialogRowsForQuery", () => {
  test("maps matched-tag failures to dialog rows", () => {
    const rows = buildCustomerAskSearchDialogRowsForQuery(
      passingSnapshot({ matchedTagsVisible: true }),
      "attention",
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]?.status).toBe("fail");
    expect(rows[0]?.route).toBe(
      SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.headerDialog,
    );
    expect(rows[0]?.checkId).toBe(
      SEARCH_SURFACE_CUSTOMER_ASK_CHECKS.dialogNoMatchedTags.checkId,
    );
    expect(rows.slice(1).every((row) => row.status === "pass")).toBe(true);
    expect(rows.slice(1).map((row) => row.checkId)).toEqual([
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogRowHoverCoherence.checkId,
      BATCH_011_FOLLOW_UP_SEARCH_CHECKS.dialogMatchedTextSelectionContrast
        .checkId,
    ]);
  });
});

describe("buildCustomerAskSearchApiGqaRow", () => {
  test("reports fetch failures on the API row", () => {
    const row = buildCustomerAskSearchApiGqaRow(null, "expected HTTP 200");

    expect(row.status).toBe("fail");
    expect(row.route).toBe(SEARCH_SURFACE_CUSTOMER_ASK_ROUTES.searchApi);
    expect(row.query).toBe("GQA");
    expect(row.reason).toBe("expected HTTP 200");
  });
});
