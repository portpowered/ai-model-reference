import "@/tests/a11y/mock-navigation";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchResultMetaDetails } from "@/features/docs/search/SearchResultMetaDetails";
import {
  isPageSearchItem,
  SearchResultRow,
} from "@/features/docs/search/SearchResultRow";
import { SearchInlineResultItem } from "@/features/docs/search/SearchResults";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { renderSearchResultListItem } from "@/tests/a11y/docs-components-fixture";
import { SAMPLE_MODULE_URL } from "@/tests/search/helpers";

describe("SearchResultMetaDetails", () => {
  test("renders URL, compact localized kind, and summary without matched-tag chips", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchResultMetaDetails
        url={SAMPLE_MODULE_URL}
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
    expect(html).toContain('data-testid="search-result-kind"');
    expect(html).toContain("Module");
    expect(html).toContain(messages.search.resultPath);
    expect(html).not.toContain('data-testid="search-result-matched-tags"');
  });
});

describe("SearchResultRow", () => {
  afterEach(() => {
    cleanup();
  });

  test("dialog surface shows GQA page hit with module kind, summary, and URL", async () => {
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

    const view = within(container);
    expect(
      view.getByRole("button", { name: "Grouped-Query Attention" }),
    ).toBeTruthy();
    expect(view.getByTestId("search-result-meta")).toBeTruthy();
    expect(container.textContent).toContain(SAMPLE_MODULE_URL);
    expect(container.textContent).toContain("Module");
    expect(container.textContent).toContain(meta.description);
    expect(view.queryByTestId("search-result-matched-tags")).toBeNull();
  });

  test("dialog surface delegates non-page hits without metadata panel", async () => {
    const { container } = await renderSearchResultListItem({
      item: {
        id: "heading-1",
        type: "heading",
        url: SAMPLE_MODULE_URL,
        content: "Overview",
      },
      query: "",
      metaByUrl: {},
    });

    const view = within(container);
    expect(view.getByRole("button", { name: "Overview" })).toBeTruthy();
    expect(view.queryByTestId("search-result-meta")).toBeNull();
  });

  test("page surface shows title, module kind, summary, and URL for /search rows", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[SAMPLE_MODULE_URL];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchResultRow
        item={{
          id: "page-gqa",
          type: "page",
          url: SAMPLE_MODULE_URL,
          content: "Grouped-Query Attention",
        }}
        metaByUrl={metaByUrl}
        messages={messages}
        surface="page"
        onActivate={() => {}}
      />,
    );

    expect(html).toContain("Grouped-Query Attention");
    expect(html).toContain(SAMPLE_MODULE_URL);
    expect(html).toContain("Module");
    expect(html).toContain(meta.description);
    expect(html).not.toContain('data-testid="search-result-matched-tags"');
  });

  test("page surface renders a simple action row without metadata panel", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(
      <SearchResultRow
        item={{
          id: "action-1",
          type: "action",
          node: "Open search page",
          onSelect: () => {},
        }}
        metaByUrl={{}}
        messages={messages}
        surface="page"
        onActivate={() => {}}
      />,
    );

    expect(html).toContain("Action");
    expect(html).not.toContain('data-testid="search-result-meta"');
  });
});

describe("SearchResultListItem and SearchInlineResultItem wrappers", () => {
  afterEach(() => {
    cleanup();
  });

  test("dialog wrapper renders shared metadata through SearchResultRow", async () => {
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );

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

    const view = within(container);
    expect(view.getByTestId("search-result-meta")).toBeTruthy();
    expect(view.getByTestId("search-result-kind").textContent).toBe("Module");
    expect(view.queryByTestId("search-result-matched-tags")).toBeNull();
  });

  test("page wrapper delegates to shared SearchResultRow", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );

    const inlineHtml = renderToStaticMarkup(
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

    const rowHtml = renderToStaticMarkup(
      <SearchResultRow
        item={{
          id: "page-gqa",
          type: "page",
          url: SAMPLE_MODULE_URL,
          content: "Grouped-Query Attention",
        }}
        metaByUrl={metaByUrl}
        messages={messages}
        surface="page"
        onActivate={() => {}}
      />,
    );

    expect(inlineHtml).toBe(rowHtml);
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
