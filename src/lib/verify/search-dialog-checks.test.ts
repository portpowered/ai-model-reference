import { describe, expect, test } from "bun:test";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import {
  evaluateSearchDialogDomSnapshot,
  evaluateSearchDialogInputHydrationAfterTyping,
  evaluateSearchDialogInputHydrationBeforeQuery,
  evaluateSearchDialogInputHydrationOutcome,
  formatPhase1SearchDialogCheckFailure,
  PHASE_1_SEARCH_DIALOG_QUERIES,
  resolveSearchDialogCheckOptionsFromEnv,
  runPhase1SearchDialogChecks,
  type SearchDialogDomSnapshot,
  type SearchDialogInputHydrationSnapshot,
} from "./phase-1-search-dialog-checks";

function passingSnapshot(
  overrides: Partial<SearchDialogDomSnapshot> = {},
): SearchDialogDomSnapshot {
  return {
    hasResults: true,
    hasEmpty: false,
    hasGroupedQueryAttentionLink: false,
    hasGroupedQueryAttentionResultUrl: true,
    hasGroupedQueryAttentionButton: false,
    ...overrides,
  };
}

function hydratedInputSnapshot(
  overrides: Partial<SearchDialogInputHydrationSnapshot> = {},
): SearchDialogInputHydrationSnapshot {
  return {
    inputVisible: true,
    inputFocused: true,
    inputValue: "GQA",
    idleVisible: false,
    loadingVisible: true,
    emptyVisible: false,
    resultsVisible: false,
    ...overrides,
  };
}

describe("PHASE_1_SEARCH_DIALOG_QUERIES", () => {
  test("covers GQA, attention, and KV cache manual-gate queries", () => {
    expect([...PHASE_1_SEARCH_DIALOG_QUERIES]).toEqual([
      "GQA",
      "attention",
      "KV cache",
    ]);
  });
});

describe("evaluateSearchDialogDomSnapshot", () => {
  test("passes when results include grouped-query-attention via result URL", () => {
    expect(
      evaluateSearchDialogDomSnapshot(passingSnapshot(), "GQA"),
    ).toBeNull();
  });

  test("passes when results include grouped-query-attention via anchor link", () => {
    expect(
      evaluateSearchDialogDomSnapshot(
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
      evaluateSearchDialogDomSnapshot(
        passingSnapshot({
          hasGroupedQueryAttentionResultUrl: false,
          hasGroupedQueryAttentionButton: true,
        }),
        "KV cache",
      ),
    ).toBeNull();
  });

  test("fails on empty-only UI without grouped-query-attention", () => {
    const reason = evaluateSearchDialogDomSnapshot(
      {
        hasResults: false,
        hasEmpty: true,
        hasGroupedQueryAttentionLink: false,
        hasGroupedQueryAttentionResultUrl: false,
        hasGroupedQueryAttentionButton: false,
      },
      "GQA",
    );

    expect(reason).toContain("empty results state");
    expect(reason).toContain(PHASE_1_GROUPED_QUERY_ATTENTION_URL);
  });

  test("fails when results render but omit grouped-query-attention", () => {
    const reason = evaluateSearchDialogDomSnapshot(
      passingSnapshot({ hasGroupedQueryAttentionResultUrl: false }),
      "attention",
    );

    expect(reason).toContain("no visible link");
    expect(reason).toContain(PHASE_1_GROUPED_QUERY_ATTENTION_URL);
  });

  test("fails when neither results nor empty state is visible", () => {
    const reason = evaluateSearchDialogDomSnapshot(
      {
        hasResults: false,
        hasEmpty: false,
        hasGroupedQueryAttentionLink: false,
        hasGroupedQueryAttentionResultUrl: false,
        hasGroupedQueryAttentionButton: false,
      },
      "KV cache",
    );

    expect(reason).toContain("no search results rendered");
  });
});

describe("search dialog input hydration", () => {
  test("requires visible input and idle state before query entry", () => {
    expect(
      evaluateSearchDialogInputHydrationBeforeQuery(
        hydratedInputSnapshot({
          idleVisible: true,
          inputFocused: false,
          inputValue: "",
        }),
      ),
    ).toBeNull();

    expect(
      evaluateSearchDialogInputHydrationBeforeQuery(
        hydratedInputSnapshot({
          inputVisible: false,
          idleVisible: true,
          inputValue: "",
        }),
      ),
    ).toContain("not visible");

    expect(
      evaluateSearchDialogInputHydrationBeforeQuery(
        hydratedInputSnapshot({
          idleVisible: false,
          inputValue: "",
        }),
      ),
    ).toContain("idle state");
  });

  test("requires focused input, updated value, and hidden idle state after typing", () => {
    expect(
      evaluateSearchDialogInputHydrationAfterTyping(
        hydratedInputSnapshot(),
        "GQA",
      ),
    ).toBeNull();

    expect(
      evaluateSearchDialogInputHydrationAfterTyping(
        hydratedInputSnapshot({ inputFocused: false }),
        "GQA",
      ),
    ).toContain("retain focus");

    expect(
      evaluateSearchDialogInputHydrationAfterTyping(
        hydratedInputSnapshot({ inputValue: "GQ" }),
        "GQA",
      ),
    ).toContain('did not update to "GQA"');

    expect(
      evaluateSearchDialogInputHydrationAfterTyping(
        hydratedInputSnapshot({ idleVisible: true }),
        "GQA",
      ),
    ).toContain("idle state remained visible");
  });

  test("accepts loading, empty, or results as terminal post-query outcomes", () => {
    expect(
      evaluateSearchDialogInputHydrationOutcome(
        hydratedInputSnapshot({ loadingVisible: true }),
      ),
    ).toBeNull();

    expect(
      evaluateSearchDialogInputHydrationOutcome(
        hydratedInputSnapshot({
          loadingVisible: false,
          emptyVisible: true,
        }),
      ),
    ).toBeNull();

    expect(
      evaluateSearchDialogInputHydrationOutcome(
        hydratedInputSnapshot({
          loadingVisible: false,
          resultsVisible: true,
        }),
      ),
    ).toBeNull();

    expect(
      evaluateSearchDialogInputHydrationOutcome(
        hydratedInputSnapshot({
          loadingVisible: false,
          emptyVisible: false,
          resultsVisible: false,
        }),
      ),
    ).toContain("no loading, results, or empty outcome");
  });
});

describe("formatPhase1SearchDialogCheckFailure", () => {
  test("includes surface, encoded query, and reason", () => {
    expect(
      formatPhase1SearchDialogCheckFailure({
        query: "KV cache",
        surface: "header-dialog",
        reason: "empty results state",
      }),
    ).toBe("header-dialog?query=KV%20cache: empty results state");
  });
});

describe("resolveSearchDialogCheckOptionsFromEnv", () => {
  test("returns pass stub when VERIFY_SEARCH_DIALOG_STUB=pass", async () => {
    const options = resolveSearchDialogCheckOptionsFromEnv({
      VERIFY_SEARCH_DIALOG_STUB: "pass",
    });

    expect(options.runQueryCheck).toBeDefined();
    await expect(
      options.runQueryCheck?.("http://127.0.0.1:1", "GQA", 1000),
    ).resolves.toBeNull();
  });

  test("returns empty options when stub env is unset", () => {
    expect(resolveSearchDialogCheckOptionsFromEnv({})).toEqual({});
  });
});

describe("runPhase1SearchDialogChecks", () => {
  test("returns no failures when injected query checks pass", async () => {
    const failures = await runPhase1SearchDialogChecks(
      "http://127.0.0.1:3200",
      {
        runQueryCheck: async () => null,
      },
    );

    expect(failures).toEqual([]);
  });

  test("returns structured failures from injected query checks", async () => {
    const failures = await runPhase1SearchDialogChecks(
      "http://127.0.0.1:3200",
      {
        queries: ["GQA"],
        runQueryCheck: async (_baseUrl, query) => `forced failure for ${query}`,
      },
    );

    const failure = failures[0];
    expect(failures).toEqual([
      {
        query: "GQA",
        surface: "header-dialog",
        reason: "forced failure for GQA",
      },
    ]);
    expect(failure).toBeDefined();
    if (!failure) {
      throw new Error("expected a header search dialog check failure");
    }
    expect(formatPhase1SearchDialogCheckFailure(failure)).toBe(
      "header-dialog?query=GQA: forced failure for GQA",
    );
  });
});
