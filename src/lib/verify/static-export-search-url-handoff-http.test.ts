import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertSearchPageExportShell,
  buildSearchPageExportShellStubBody,
} from "./phase-1-search-export-shell-checks";
import { createStaticExportHttpServer } from "./static-export-http-server";
import {
  evaluateSearchPageQueryHandoff,
  evaluateSearchPageQueryPrecedenceOverTag,
  evaluateSearchPageTagHandoff,
  SEARCH_PAGE_TAG_FILTER_DESCRIPTION_PREFIX,
  verifyStaticExportSearchUrlHandoff,
} from "./static-export-search-url-handoff-http";

describe("evaluateSearchPageQueryHandoff", () => {
  test("passes when ?q= prefills the input and leaves idle hidden", () => {
    expect(
      evaluateSearchPageQueryHandoff(
        {
          inputVisible: true,
          inputValue: "GQA",
          tagFilterDescriptionVisible: false,
          tagFilterDescriptionText: "",
          idleVisible: false,
          loadingVisible: false,
          resultsVisible: true,
          emptyVisible: false,
        },
        "GQA",
      ),
    ).toBeNull();
  });

  test("fails when the input does not prefill from ?q=", () => {
    expect(
      evaluateSearchPageQueryHandoff(
        {
          inputVisible: true,
          inputValue: "",
          tagFilterDescriptionVisible: false,
          tagFilterDescriptionText: "",
          idleVisible: true,
          loadingVisible: false,
          resultsVisible: false,
          emptyVisible: false,
        },
        "GQA",
      ),
    ).toContain('did not prefill to "GQA"');
  });
});

describe("evaluateSearchPageTagHandoff", () => {
  test("passes when ?tag= shows description copy and prefills the tag slug", () => {
    expect(
      evaluateSearchPageTagHandoff(
        {
          inputVisible: true,
          inputValue: "attention",
          tagFilterDescriptionVisible: true,
          tagFilterDescriptionText: `${SEARCH_PAGE_TAG_FILTER_DESCRIPTION_PREFIX}attention.`,
          idleVisible: false,
          loadingVisible: false,
          resultsVisible: true,
          emptyVisible: false,
        },
        "attention",
      ),
    ).toBeNull();
  });

  test("fails when tag filter description copy is missing", () => {
    expect(
      evaluateSearchPageTagHandoff(
        {
          inputVisible: true,
          inputValue: "attention",
          tagFilterDescriptionVisible: false,
          tagFilterDescriptionText: "",
          idleVisible: false,
          loadingVisible: false,
          resultsVisible: true,
          emptyVisible: false,
        },
        "attention",
      ),
    ).toContain("tag filter description is not visible");
  });
});

describe("evaluateSearchPageQueryPrecedenceOverTag", () => {
  test("passes when ?q= wins over ?tag=", () => {
    expect(
      evaluateSearchPageQueryPrecedenceOverTag(
        {
          inputVisible: true,
          inputValue: "GQA",
          tagFilterDescriptionVisible: false,
          tagFilterDescriptionText: "",
          idleVisible: false,
          loadingVisible: false,
          resultsVisible: true,
          emptyVisible: false,
        },
        "GQA",
        "attention",
      ),
    ).toBeNull();
  });

  test("fails when tag description remains visible with both params", () => {
    expect(
      evaluateSearchPageQueryPrecedenceOverTag(
        {
          inputVisible: true,
          inputValue: "GQA",
          tagFilterDescriptionVisible: true,
          tagFilterDescriptionText: `${SEARCH_PAGE_TAG_FILTER_DESCRIPTION_PREFIX}attention.`,
          idleVisible: false,
          loadingVisible: false,
          resultsVisible: true,
          emptyVisible: false,
        },
        "GQA",
        "attention",
      ),
    ).toContain("tag filter description remained visible");
  });
});

describe("verifyStaticExportSearchUrlHandoff", () => {
  test(
    "returns a failure reason when export HTML lacks the search input shell",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "search-handoff-missing-"));
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
        const reason = await verifyStaticExportSearchUrlHandoff(
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
    { timeout: 60_000 },
  );

  test("returns a failure reason when SSR shell exists but URL handoff never hydrates", () => {
    const stubHtml = `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`;
    expect(assertSearchPageExportShell(stubHtml)).toBeNull();
    expect(
      evaluateSearchPageQueryHandoff(
        {
          inputVisible: true,
          inputValue: "",
          tagFilterDescriptionVisible: false,
          tagFilterDescriptionText: "",
          idleVisible: true,
          loadingVisible: false,
          resultsVisible: false,
          emptyVisible: false,
        },
        "GQA",
      ),
    ).toContain('did not prefill to "GQA"');
  });
});
