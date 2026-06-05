import "@/tests/a11y/mock-navigation";
import { describe, expect, test } from "bun:test";
import { screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchResultMetaDetails } from "@/features/docs/search/SearchResultMetaDetails";
import {
  isPageSearchItem,
  SearchInlineResultItem,
} from "@/features/docs/search/SearchResults";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { renderSearchResultListItem } from "@/tests/a11y/docs-components-fixture";
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

describe("SearchResultListItem", () => {
  test("GQA page hit shows dialog row with module kind, summary, and URL", async () => {
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const { container } = await renderSearchResultListItem({
      item: {
        id: "page-gqa",
        type: "page",
        url: SAMPLE_MODULE_URL,
        content: "Grouped-Query Attention",
      },
      query: "GQA",
      metaByUrl,
    });

    expect(
      screen.getByRole("button", { name: "Grouped-Query Attention" }),
    ).toBeTruthy();
    expect(screen.getByTestId("search-result-meta")).toBeTruthy();
    expect(container.textContent).toContain(SAMPLE_MODULE_URL);
    expect(container.textContent).toContain("Module");
    expect(container.textContent).toContain(meta.description);
  });

  test("non-page hits delegate to SearchDialogListItem without metadata panel", async () => {
    await renderSearchResultListItem({
      item: {
        id: "heading-1",
        type: "heading",
        url: SAMPLE_MODULE_URL,
        content: "Overview",
      },
      query: "",
      metaByUrl: {},
    });

    expect(screen.getByRole("button", { name: "Overview" })).toBeTruthy();
    expect(screen.queryByTestId("search-result-meta")).toBeNull();
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

describe("SearchInlineResultItem non-page hits", () => {
  test("renders a simple action row without metadata panel", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(
      <SearchInlineResultItem
        item={{
          id: "action-1",
          type: "action",
          node: "Open search page",
          onSelect: () => {},
        }}
        query=""
        metaByUrl={{}}
        messages={messages}
        onSelect={() => {}}
      />,
    );

    expect(html).toContain("Action");
    expect(html).not.toContain('data-testid="search-result-meta"');
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
