import { describe, expect, test } from "bun:test";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import {
  evaluateSearchDialogDomSnapshot,
  formatPhase1SearchDialogCheckFailure,
  formatSearchDialogOpenFailureReason,
  PHASE_1_SEARCH_DIALOG_QUERIES,
  resolveSearchDialogCheckOptionsFromEnv,
  runPhase1SearchDialogChecks,
  type SearchDialogDomSnapshot,
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

describe("formatSearchDialogOpenFailureReason", () => {
  test("describes a home-page dialog open timeout", () => {
    expect(formatSearchDialogOpenFailureReason(45_000)).toBe(
      "did not open the header search dialog on the home page within 45000ms",
    );
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

  test("returns per-query failures when the dialog never opens", async () => {
    const failures = await runPhase1SearchDialogChecks(
      "http://127.0.0.1:3200",
      {
        queries: ["GQA", "attention"],
        launchBrowser: async () =>
          ({
            newPage: async () =>
              ({
                setDefaultTimeout() {},
              }) as never,
            close: async () => {},
          }) as never,
        openDialog: async () => {
          throw new Error(
            "did not open the header search dialog on the home page within 45000ms",
          );
        },
      },
    );

    expect(failures).toEqual([
      {
        query: "GQA",
        surface: "header-dialog",
        reason:
          "did not open the header search dialog on the home page within 45000ms",
      },
      {
        query: "attention",
        surface: "header-dialog",
        reason:
          "did not open the header search dialog on the home page within 45000ms",
      },
    ]);
  });
});
