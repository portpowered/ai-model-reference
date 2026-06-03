import { describe, expect, test } from "bun:test";
import {
  getMatchedTags,
  resolveSearchResultMeta,
} from "@/features/docs/search/search-result-meta-client";
import { formatPageKind, loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { SAMPLE_MODULE_URL } from "@/tests/search/helpers";

const SAMPLE_URL = "/docs/modules/grouped-query-attention";

describe("search UI messages", () => {
  test("loads localized copy for dialog, trigger, and result states", async () => {
    const messages = await loadUiMessages();
    expect(messages.search.open).toBe("Open search");
    expect(messages.search.placeholder.length).toBeGreaterThan(0);
    expect(messages.search.close.length).toBeGreaterThan(0);
    expect(messages.search.idle.length).toBeGreaterThan(0);
    expect(messages.search.noResults.length).toBeGreaterThan(0);
    expect(messages.search.loading.length).toBeGreaterThan(0);
    expect(messages.search.shortcut.length).toBeGreaterThan(0);
    expect(messages.search.resultPath.length).toBeGreaterThan(0);
  });

  test("formatPageKind resolves module kind for search results", async () => {
    const messages = await loadUiMessages();
    expect(formatPageKind(messages, "module")).toBe("Module");
  });
});

describe("search result presentation meta", () => {
  test("GQA query ranks grouped-query attention page hit for dialog rows", async () => {
    const results = await docsSearchApi.search("GQA");
    expect(results[0]?.type).toBe("page");
    expect(results[0]?.url).toBe(SAMPLE_MODULE_URL);
  });

  test("sample module meta includes kind, summary, and tags for dialog rows", async () => {
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = resolveSearchResultMeta(SAMPLE_URL, metaByUrl);
    expect(meta?.kind).toBe("module");
    expect(meta?.description.length).toBeGreaterThan(0);
    expect(meta?.tags).toContain("attention");
    expect(getMatchedTags("attention", meta?.tags ?? [])).toContain(
      "attention",
    );
  });
});
