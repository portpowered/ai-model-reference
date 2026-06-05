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
import {
  searchDialogResultRowClassName,
  searchPageResultRowClassName,
  searchResultTitleMarkClassName,
} from "@/features/docs/search/search-result-row-classes";
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

  test("dialog surface keeps metadata inside the interactive row for full-row highlight", async () => {
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
    const row = view.getByTestId("search-result-row");
    const meta = view.getByTestId("search-result-meta");
    expect(row.contains(meta)).toBe(true);
    expect(row.className).toContain("overflow-visible");
    expect(row.className).toContain("group");
    for (const token of searchDialogResultRowClassName.split(/\s+/)) {
      if (token.length > 0) {
        expect(row.className).toContain(token);
      }
    }
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
    const row = view.getByTestId("search-result-row");
    expect(view.getByRole("button", { name: "Grouped-Query Attention" })).toBe(
      row,
    );
    expect(row.contains(view.getByTestId("search-result-meta"))).toBe(true);
    expect(container.textContent).toContain(SAMPLE_MODULE_URL);
    expect(container.textContent).toContain("Module");
    expect(container.textContent).toContain(meta.description);
    expect(view.queryByTestId("search-result-matched-tags")).toBeNull();
  });

  test("page surface omits metadata when meta is unavailable", async () => {
    const messages = await loadUiMessages();

    const html = renderToStaticMarkup(
      <SearchResultRow
        item={{
          id: "page-unknown",
          type: "page",
          url: "/docs/modules/unknown-module",
          content: "Unknown module",
        }}
        query=""
        metaByUrl={{}}
        messages={messages}
        surface="page"
        onActivate={() => {}}
      />,
    );

    expect(html).toContain("Unknown module");
    expect(html).not.toContain('data-testid="search-result-meta"');
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

  test("page surface keeps metadata inside the interactive row for full-row hover", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );

    const html = renderToStaticMarkup(
      <SearchResultRow
        item={{
          id: "page-gqa",
          type: "page",
          url: SAMPLE_MODULE_URL,
          content: "Grouped-Query Attention",
        }}
        query="Grouped"
        metaByUrl={metaByUrl}
        messages={messages}
        surface="page"
        onActivate={() => {}}
        className="px-3 py-2"
      />,
    );

    expect(html).toContain('data-testid="search-result-row"');
    expect(html).toContain('data-testid="search-result-meta"');
    expect(html).toContain("hover:bg-accent");
    expect(html).toContain("group-hover:text-accent-foreground/90");
    for (const token of searchPageResultRowClassName.split(/\s+/)) {
      if (token.length > 0) {
        expect(html).toContain(token);
      }
    }
    const rowOpen = html.indexOf('data-testid="search-result-row"');
    const metaOpen = html.indexOf('data-testid="search-result-meta"');
    const rowClose = html.indexOf("</button>", rowOpen);
    expect(rowOpen).toBeGreaterThanOrEqual(0);
    expect(metaOpen).toBeGreaterThan(rowOpen);
    expect(metaOpen).toBeLessThan(rowClose);
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
        query="Grouped"
        metaByUrl={metaByUrl}
        messages={messages}
        surface="page"
        onActivate={() => {}}
      />,
    );

    expect(html).toContain('data-testid="search-result-row"');
    expect(html).toContain("Grouped-Query Attention");
    expect(html).toContain(SAMPLE_MODULE_URL);
    expect(html).toContain("Module");
    expect(html).toContain(meta.description);
    expect(html).not.toContain('data-testid="search-result-matched-tags"');
    const rowOpen = html.indexOf('data-testid="search-result-row"');
    const metaOpen = html.indexOf('data-testid="search-result-meta"');
    const rowClose = html.indexOf("</button>", rowOpen);
    expect(metaOpen).toBeGreaterThan(rowOpen);
    expect(metaOpen).toBeLessThan(rowClose);
  });

  test("page surface renders query-match marks with accent-safe classes", async () => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );

    const html = renderToStaticMarkup(
      <SearchResultRow
        item={{
          id: "page-gqa",
          type: "page",
          url: SAMPLE_MODULE_URL,
          content: "<mark>Grouped</mark>-Query Attention",
        }}
        query="Grouped"
        metaByUrl={metaByUrl}
        messages={messages}
        surface="page"
        onActivate={() => {}}
      />,
    );

    expect(html).toContain('data-testid="search-result-title-mark"');
    expect(html).toContain("Grouped</mark>-Query Attention");
    expect(html).not.toContain("&lt;mark&gt;");
    for (const token of searchResultTitleMarkClassName.split(/\s+/)) {
      if (token.length > 0) {
        expect(html).toContain(token);
      }
    }
  });

  test("dialog surface renders query-match marks inside the interactive row", async () => {
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );

    const { container } = await renderSearchResultListItem({
      item: {
        id: "page-gqa",
        type: "page",
        url: SAMPLE_MODULE_URL,
        content: "<mark>Grouped</mark>-Query Attention",
      },
      query: "Grouped",
      metaByUrl,
    });

    const view = within(container);
    const row = view.getByTestId("search-result-row");
    const mark = view.getByTestId("search-result-title-mark");
    expect(row.contains(mark)).toBe(true);
    expect(mark.className).toContain(
      "group-aria-selected:text-fd-accent-foreground",
    );
    expect(mark.textContent).toBe("Grouped");
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
        query=""
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
        query="GQA"
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
