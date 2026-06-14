import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shouldRunExportIntegrationProbeTests } from "./export-integration-probe-lock";
import { buildSearchPageExportShellStubBody } from "./phase-1-search-export-shell-checks";
import { createStaticExportHttpServer } from "./static-export-http-server";
import {
  ATTENTION_TAG_PATH_SUFFIX,
  EMPTY_SUGGESTION_ATTENTION_LINK_LABEL,
  EMPTY_SUGGESTION_GQA,
  evaluateSearchPageEmptyState,
  evaluateSearchPageErrorState,
  evaluateSearchPageResultsAccessibility,
  isRetryableStaticExportSearchProbeFailure,
  SEARCH_RETRY_LABEL,
  verifyStaticExportSearchEmptyErrorStates,
} from "./static-export-search-empty-error-states-http";

describe("evaluateSearchPageEmptyState", () => {
  test("passes when empty state shows customer-facing copy and suggestions", () => {
    expect(
      evaluateSearchPageEmptyState({
        emptyVisible: true,
        noResultsCopyVisible: true,
        gqaSuggestionVisible: true,
        attentionLinkVisible: true,
        attentionLinkHref: `/ai-model-reference${ATTENTION_TAG_PATH_SUFFIX}`,
        liveRegionPolite: true,
      }),
    ).toBeNull();
  });

  test("fails when empty state is hidden", () => {
    expect(
      evaluateSearchPageEmptyState({
        emptyVisible: false,
        noResultsCopyVisible: false,
        gqaSuggestionVisible: false,
        attentionLinkVisible: false,
        attentionLinkHref: null,
        liveRegionPolite: true,
      }),
    ).toContain("empty state is not visible");
  });

  test("fails when GQA suggestion or attention link are missing", () => {
    expect(
      evaluateSearchPageEmptyState({
        emptyVisible: true,
        noResultsCopyVisible: true,
        gqaSuggestionVisible: false,
        attentionLinkVisible: true,
        attentionLinkHref: ATTENTION_TAG_PATH_SUFFIX,
        liveRegionPolite: true,
      }),
    ).toContain(EMPTY_SUGGESTION_GQA);

    expect(
      evaluateSearchPageEmptyState({
        emptyVisible: true,
        noResultsCopyVisible: true,
        gqaSuggestionVisible: true,
        attentionLinkVisible: false,
        attentionLinkHref: null,
        liveRegionPolite: true,
      }),
    ).toContain(EMPTY_SUGGESTION_ATTENTION_LINK_LABEL);
  });
});

describe("evaluateSearchPageErrorState", () => {
  test("passes when error copy and retry control are visible", () => {
    expect(
      evaluateSearchPageErrorState({
        errorVisible: true,
        errorCopyVisible: true,
        retryVisible: true,
      }),
    ).toBeNull();
  });

  test("fails when error state is hidden", () => {
    expect(
      evaluateSearchPageErrorState({
        errorVisible: false,
        errorCopyVisible: false,
        retryVisible: false,
      }),
    ).toContain("error state is not visible");
  });

  test("fails when retry control is missing", () => {
    expect(
      evaluateSearchPageErrorState({
        errorVisible: true,
        errorCopyVisible: true,
        retryVisible: false,
      }),
    ).toContain(SEARCH_RETRY_LABEL);
  });
});

describe("evaluateSearchPageResultsAccessibility", () => {
  test("passes when aria-live region exists and first result row is focusable", () => {
    expect(
      evaluateSearchPageResultsAccessibility({
        liveRegionPolite: true,
        resultsVisible: true,
        firstResultRowFocusable: true,
      }),
    ).toBeNull();
  });

  test("fails when result rows are not keyboard focusable", () => {
    expect(
      evaluateSearchPageResultsAccessibility({
        liveRegionPolite: true,
        resultsVisible: true,
        firstResultRowFocusable: false,
      }),
    ).toContain("keyboard focusable");
  });
});

describe("verifyStaticExportSearchEmptyErrorStates", () => {
  if (!shouldRunExportIntegrationProbeTests()) {
    test("skips Playwright probes during coverage subprocess rerun", () => {});
    return;
  }

  test(
    "returns a failure reason when export HTML lacks the search input shell",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "search-empty-error-missing-"));
      const outDir = join(root, "out");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, "search.html"),
        "<html><body>Search</body></html>",
      );

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportSearchEmptyErrorStates(
          server.baseUrl,
          {
            timeoutMs: 5_000,
          },
        );
        expect(reason).toMatch(/search-page-input|Search Model Atlas/);
      } finally {
        await server.cleanup();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 15_000 },
  );

  test(
    "returns a failure reason when SSR shell exists but empty state never hydrates",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "search-empty-error-static-"));
      const outDir = join(root, "out");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, "search.html"),
        `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
      );

      const server = await createStaticExportHttpServer({
        outDir: "out",
        cwd: root,
      });
      try {
        const reason = await verifyStaticExportSearchEmptyErrorStates(
          server.baseUrl,
          {
            timeoutMs: 5_000,
          },
        );
        expect(reason).toMatch(
          /empty state is not visible|timed out waiting for empty state|did not hydrate|did not update/,
        );
      } finally {
        await server.cleanup();
        rmSync(root, { recursive: true, force: true });
      }
    },
    { timeout: 30_000 },
  );
});

describe("isRetryableStaticExportSearchProbeFailure", () => {
  test("detects transient Playwright spawn failures", () => {
    expect(isRetryableStaticExportSearchProbeFailure(null)).toBe(false);
    expect(isRetryableStaticExportSearchProbeFailure("Failed to connect")).toBe(
      true,
    );
    expect(
      isRetryableStaticExportSearchProbeFailure(
        "empty state is not visible on /search for a no-match query",
      ),
    ).toBe(false);
  });
});
