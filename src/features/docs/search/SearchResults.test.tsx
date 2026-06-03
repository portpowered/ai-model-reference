import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchResultMetaDetails } from "@/features/docs/search/SearchResultMetaDetails";
import {
  isPageSearchItem,
  SearchInlineResultItem,
} from "@/features/docs/search/SearchResults";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { SAMPLE_MODULE_URL } from "@/tests/search/helpers";

describe("SearchResultMetaDetails", () => {
  test("renders URL, localized kind label, summary, and matched tags for fixture meta", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchResultMetaDetails
        url={SAMPLE_MODULE_URL}
        query="attention"
        meta={meta}
        messages={messages}
      />,
    );

    expect(html).toContain('data-testid="search-result-meta"');
    expect(html).toContain('data-testid="search-result-url"');
    expect(html).toContain(SAMPLE_MODULE_URL);
    expect(html).toContain('data-testid="search-result-summary"');
    expect(meta.description.length).toBeGreaterThan(0);
    expect(html).toContain(meta.description);
    expect(html).toContain("Module");
    expect(html).toContain("attention");
    expect(html).toContain(messages.search.resultPath);
  });
});

describe("SearchResultListItem GQA dialog row", () => {
  test("GQA page hit meta panel shows module kind, summary, and URL", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchResultMetaDetails
        url={SAMPLE_MODULE_URL}
        query="GQA"
        meta={meta}
        messages={messages}
      />,
    );

    expect(html).toContain("Module");
    expect(html).toContain(SAMPLE_MODULE_URL);
    expect(html).toContain(meta.description);
    expect(meta.tags).toContain("attention");
  });
});

describe("SearchInlineResultItem", () => {
  test("GQA page hit shows title, module kind, summary, and URL for /search rows", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchInlineResultItem
        item={{
          id: "page-gqa",
          type: "page",
          url: SAMPLE_MODULE_URL,
          content: "Grouped-Query Attention",
        }}
        query="GQA"
        metaByUrl={metaByUrl}
        messages={messages}
        onSelect={() => {}}
      />,
    );

    expect(html).toContain("Grouped-Query Attention");
    expect(html).toContain(SAMPLE_MODULE_URL);
    expect(html).toContain("Module");
    expect(html).toContain(meta.description);
  });
});

describe("isPageSearchItem", () => {
  test("only page hits use the rich metadata panel", () => {
    expect(
      isPageSearchItem({
        id: "page-1",
        type: "page",
        url: SAMPLE_MODULE_URL,
        content: "Grouped-Query Attention",
      }),
    ).toBe(true);
    expect(
      isPageSearchItem({
        id: "heading-1",
        type: "heading",
        url: SAMPLE_MODULE_URL,
        content: "Overview",
      }),
    ).toBe(false);
    expect(
      isPageSearchItem({
        id: "text-1",
        type: "text",
        url: `${SAMPLE_MODULE_URL}#kv-cache`,
        content: "KV cache",
      }),
    ).toBe(false);
  });
});
