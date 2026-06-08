import { describe, expect, test } from "bun:test";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import {
  evaluateSearchPageCanonicalResultUrls,
  evaluateSearchPageDomSnapshot,
  formatPhase1SearchPageCheckFailure,
  PHASE_1_SEARCH_PAGE_QUERIES,
  resolveSearchPageCheckOptionsFromEnv,
  runPhase1SearchPageChecks,
  type SearchPageDomSnapshot,
} from "./phase-1-search-page-checks";

function passingSnapshot(
  overrides: Partial<SearchPageDomSnapshot> = {},
): SearchPageDomSnapshot {
  return {
    hasResults: true,
    hasEmpty: false,
    hasGroupedQueryAttentionLink: false,
    hasGroupedQueryAttentionResultUrl: true,
    hasGroupedQueryAttentionButton: false,
    resultUrls: [
      PHASE_1_GROUPED_QUERY_ATTENTION_URL,
      "/docs/modules/attention",
    ],
    ...overrides,
  };
}

describe("PHASE_1_SEARCH_PAGE_QUERIES", () => {
  test("covers GQA, attention, and KV cache manual-gate queries", () => {
    expect([...PHASE_1_SEARCH_PAGE_QUERIES]).toEqual([
      "GQA",
      "attention",
      "KV cache",
    ]);
  });
});

describe("evaluateSearchPageCanonicalResultUrls", () => {
  test("passes when each canonical page URL appears once without fragments", () => {
    expect(
      evaluateSearchPageCanonicalResultUrls(
        passingSnapshot({
          resultUrls: [
            PHASE_1_GROUPED_QUERY_ATTENTION_URL,
            "/docs/modules/attention",
          ],
        }),
      ),
    ).toBeNull();
  });

  test("fails when result URLs include hash fragments", () => {
    expect(
      evaluateSearchPageCanonicalResultUrls(
        passingSnapshot({
          resultUrls: [
            `${PHASE_1_GROUPED_QUERY_ATTENTION_URL}#Grouped-Query Attention`,
          ],
        }),
      ),
    ).toContain("hash fragment");
  });

  test("fails when multiple rows duplicate one canonical page URL", () => {
    expect(
      evaluateSearchPageCanonicalResultUrls(
        passingSnapshot({
          resultUrls: [
            PHASE_1_GROUPED_QUERY_ATTENTION_URL,
            PHASE_1_GROUPED_QUERY_ATTENTION_URL,
          ],
        }),
      ),
    ).toContain("duplicate one canonical page URL");
  });
});

describe("evaluateSearchPageDomSnapshot", () => {
  test("passes when results include grouped-query-attention via result URL", () => {
    expect(evaluateSearchPageDomSnapshot(passingSnapshot(), "GQA")).toBeNull();
  });

  test("passes when results include grouped-query-attention via anchor link", () => {
    expect(
      evaluateSearchPageDomSnapshot(
        passingSnapshot({
          hasGroupedQueryAttentionResultUrl: false,
          hasGroupedQueryAttentionLink: true,
        }),
        "attention",
      ),
    ).toBeNull();
  });

  test("passes when results include grouped-query-attention via button title", () => {
    expect(
      evaluateSearchPageDomSnapshot(
        passingSnapshot({
          hasGroupedQueryAttentionResultUrl: false,
          hasGroupedQueryAttentionButton: true,
        }),
        "KV cache",
      ),
    ).toBeNull();
  });

  test("fails on empty-only UI without grouped-query-attention", () => {
    const reason = evaluateSearchPageDomSnapshot(
      {
        hasResults: false,
        hasEmpty: true,
        hasGroupedQueryAttentionLink: false,
        hasGroupedQueryAttentionResultUrl: false,
        hasGroupedQueryAttentionButton: false,
        resultUrls: [],
      },
      "GQA",
    );

    expect(reason).toContain("empty results state");
    expect(reason).toContain(PHASE_1_GROUPED_QUERY_ATTENTION_URL);
  });

  test("fails when results render but omit grouped-query-attention", () => {
    const reason = evaluateSearchPageDomSnapshot(
      passingSnapshot({
        hasGroupedQueryAttentionResultUrl: false,
        resultUrls: ["/docs/modules/attention"],
      }),
      "attention",
    );

    expect(reason).toContain("no visible link");
    expect(reason).toContain(PHASE_1_GROUPED_QUERY_ATTENTION_URL);
  });

  test("fails when results duplicate one canonical page URL", () => {
    const reason = evaluateSearchPageDomSnapshot(
      passingSnapshot({
        resultUrls: [
          PHASE_1_GROUPED_QUERY_ATTENTION_URL,
          PHASE_1_GROUPED_QUERY_ATTENTION_URL,
        ],
      }),
      "GQA",
    );

    expect(reason).toContain("duplicate one canonical page URL");
  });

  test("fails when neither results nor empty state is visible", () => {
    const reason = evaluateSearchPageDomSnapshot(
      {
        hasResults: false,
        hasEmpty: false,
        hasGroupedQueryAttentionLink: false,
        hasGroupedQueryAttentionResultUrl: false,
        hasGroupedQueryAttentionButton: false,
        resultUrls: [],
      },
      "KV cache",
    );

    expect(reason).toContain("no search results rendered");
  });
});

describe("formatPhase1SearchPageCheckFailure", () => {
  test("includes surface, encoded query, and reason", () => {
    expect(
      formatPhase1SearchPageCheckFailure({
        query: "KV cache",
        surface: "/search",
        reason: "empty results state",
      }),
    ).toBe("/search?query=KV%20cache: empty results state");
  });
});

describe("resolveSearchPageCheckOptionsFromEnv", () => {
  test("returns pass stub when VERIFY_SEARCH_PAGE_STUB=pass", async () => {
    const options = resolveSearchPageCheckOptionsFromEnv({
      VERIFY_SEARCH_PAGE_STUB: "pass",
    });

    expect(options.runQueryCheck).toBeDefined();
    await expect(
      options.runQueryCheck?.("http://127.0.0.1:1", "GQA", 1000),
    ).resolves.toBeNull();
  });

  test("returns empty options when stub env is unset", () => {
    expect(resolveSearchPageCheckOptionsFromEnv({})).toEqual({});
  });
});

describe("runPhase1SearchPageChecks", () => {
  test("returns no failures when injected query checks pass", async () => {
    const failures = await runPhase1SearchPageChecks("http://127.0.0.1:3200", {
      runQueryCheck: async () => null,
    });

    expect(failures).toEqual([]);
  });

  test("returns structured failures from injected query checks", async () => {
    const failures = await runPhase1SearchPageChecks("http://127.0.0.1:3200", {
      queries: ["GQA"],
      runQueryCheck: async (_baseUrl, query) => `forced failure for ${query}`,
    });

    const failure = failures[0];
    expect(failures).toEqual([
      {
        query: "GQA",
        surface: "/search",
        reason: "forced failure for GQA",
      },
    ]);
    expect(failure).toBeDefined();
    if (!failure) {
      throw new Error("expected a /search page check failure");
    }
    expect(formatPhase1SearchPageCheckFailure(failure)).toBe(
      "/search?query=GQA: forced failure for GQA",
    );
  });
});
