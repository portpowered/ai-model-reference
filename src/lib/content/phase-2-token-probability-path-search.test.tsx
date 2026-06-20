import "@/tests/a11y/mock-navigation";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchPagePanelContent } from "@/features/docs/search/SearchPagePanel";
import { SearchResultMetaDetails } from "@/features/docs/search/SearchResultMetaDetails";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { TARGET_PATH_REGISTRY_IDS } from "@/lib/content/phase-2-token-probability-path-inventory";
import { loadRegistry } from "@/lib/content/registry";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import {
  buildSearchResultMetaMap,
  loadSearchResultMetaMap,
} from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import {
  captureOriginalFetch,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";
import { createDocsSearchRouteFetch } from "@/tests/search/route-fetch";
import { lockGlobalFetch } from "@/tests/shared/global-fetch-lock";

const TARGET_PATH_PAGES = [
  {
    slug: "token",
    title: "Token",
    url: "/docs/glossary/token",
    summarySnippet: "smallest unit of text",
    aliasQueries: ["tokens", "subword token"] as const,
  },
  {
    slug: "embedding",
    title: "Embedding",
    url: "/docs/glossary/embedding",
    summarySnippet: "dense vector",
    aliasQueries: ["embeddings", "token embedding"] as const,
  },
  {
    slug: "logit",
    title: "Logit",
    url: "/docs/glossary/logit",
    summarySnippet: "raw, unnormalized score",
    aliasQueries: ["logits", "pre-softmax score"] as const,
  },
  {
    slug: "softmax",
    title: "Softmax",
    url: "/docs/glossary/softmax",
    summarySnippet: "probability distribution",
    aliasQueries: ["softmax function"] as const,
  },
] as const;

const TARGET_PATH_URLS = TARGET_PATH_PAGES.map((page) => page.url);
const CHAIN_TAG = "token-to-probability-chain";
const SOFTMAX_MODULE_URL = "/docs/modules/linear-attention";
const NO_MATCH_QUERY = "zzzz-no-token-path-matches-zzzz";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

function installDocsSearchRouteFetch(): void {
  globalThis.fetch = createDocsSearchRouteFetch();
}

async function primeDocsSearchClient(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
): Promise<void> {
  const first = await renderWithAppProviders(
    <SearchPagePanelContent
      messages={context.messages}
      metaByUrl={context.metaByUrl}
      handoff={{ q: null, tag: null }}
    />,
    { context },
  );
  first.unmount();
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 400));
}

describe("Phase 2 token-probability path search indexing (phase-2-token-probability-path-convergence-004)", () => {
  test("indexes target-path glossary pages with glossary kind facets and foundations tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const { url } of TARGET_PATH_PAGES) {
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.kind).toBe("glossary");
      expect(document?.facets.kind).toBe("glossary");
      expect(document?.tags).toEqual(
        expect.arrayContaining([CHAIN_TAG, "foundations"]),
      );
      expect(document?.description.length).toBeGreaterThan(0);
      expect(document?.aliases.length).toBeGreaterThan(0);
    }
  });

  test("search result meta map includes glossary kind for every target-path page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const metaMap = buildSearchResultMetaMap(documents);

    for (const { url } of TARGET_PATH_PAGES) {
      const meta = metaMap.get(url);
      expect(meta).toBeDefined();
      expect(meta?.kind).toBe("glossary");
      expect(meta?.description.length).toBeGreaterThan(0);
      expect(meta?.tags).toEqual(
        expect.arrayContaining([CHAIN_TAG, "foundations"]),
      );
    }
  });

  test("target-path registry ids align with indexed search document routes", () => {
    expect([...TARGET_PATH_REGISTRY_IDS]).toEqual([
      "concept.token",
      "concept.embedding",
      "concept.logit",
      "concept.softmax",
    ]);
    expect(
      TARGET_PATH_PAGES.map((page) => `/docs/glossary/${page.slug}`),
    ).toEqual([...TARGET_PATH_URLS]);
  });
});

describe("Phase 2 token-probability path search ranking (phase-2-token-probability-path-convergence-004)", () => {
  test.each(
    TARGET_PATH_PAGES.map(({ title, url }) => [title, url] as const),
  )("ranks %s glossary first for canonical title query", async (title, url) => {
    const results = await docsSearchApi.search(title);
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(url);
  });

  test.each(
    TARGET_PATH_PAGES.flatMap(({ aliasQueries, url }) =>
      aliasQueries.map((query) => [query, url] as const),
    ),
  )("alias query %s ranks the target glossary first", async (query, url) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(url);
  });

  test("softmax query keeps glossary first while module hits remain discoverable with distinct kind metadata", async () => {
    const results = await docsSearchApi.search("softmax");
    const metaMap = await loadSearchResultMetaMap();

    expect(pageBaseUrl(results[0]?.url ?? "")).toBe("/docs/glossary/softmax");
    expect(resultsIncludeUrl(results, SOFTMAX_MODULE_URL)).toBe(true);
    expect(metaMap.get("/docs/glossary/softmax")?.kind).toBe("glossary");
    expect(metaMap.get(SOFTMAX_MODULE_URL)?.kind).toBe("module");
  });

  test("no-match query returns explicit empty results instead of incidental target-path hits", async () => {
    const results = await docsSearchApi.search(NO_MATCH_QUERY);
    expect(results).toEqual([]);
    for (const url of TARGET_PATH_URLS) {
      expect(resultsIncludeUrl(results, url)).toBe(false);
    }
  });
});

describe("Phase 2 token-probability path search UI labels (phase-2-token-probability-path-convergence-004)", () => {
  test.each(
    TARGET_PATH_PAGES.map(
      ({ url, summarySnippet }) => [url, summarySnippet] as const,
    ),
  )("SearchResultMetaDetails shows localized Glossary kind for %s", async (url, summarySnippet) => {
    const messages = await loadUiMessages();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const meta = metaByUrl[url];
    expect(meta).toBeDefined();

    const html = renderToStaticMarkup(
      <SearchResultMetaDetails url={url} meta={meta} messages={messages} />,
    );

    expect(html).toContain("Glossary");
    expect(html).not.toContain("Module");
    expect(html).not.toContain("Model");
    expect(html).toContain('data-testid="search-result-kind"');
    expect(html).toContain('data-testid="search-result-summary"');
    expect(html).toContain(summarySnippet);
  });
});

describe("Phase 2 token-probability path search panel verification (phase-2-token-probability-path-convergence-004)", () => {
  let releaseFetchLock: (() => void) | null = null;

  beforeAll(async () => {
    captureOriginalFetch();
    await lockGlobalFetch().then(async (release) => {
      releaseFetchLock = release;
      installDocsSearchRouteFetch();
      await primeDocsSearchClient(await loadAppTestContext());
      restoreFetchMock();
      releaseFetchLock?.();
      releaseFetchLock = null;
    });
  });

  beforeEach(async () => {
    releaseFetchLock = await lockGlobalFetch();
    installDocsSearchRouteFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
    releaseFetchLock?.();
    releaseFetchLock = null;
  });

  test.each(
    TARGET_PATH_PAGES.map(({ title, url }) => [title, url] as const),
  )("/search panel shows Glossary kind for %s query", async (title, url) => {
    const context = await loadAppTestContext();
    await renderWithAppProviders(
      <SearchPagePanelContent
        messages={context.messages}
        metaByUrl={context.metaByUrl}
        handoff={{ q: null, tag: null }}
      />,
      { context },
    );

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      title,
    );

    const results = await screen.findByTestId(
      "search-page-results",
      {},
      { timeout: 15_000 },
    );
    const firstUrl = within(results).getAllByTestId("search-result-url")[0];
    expect(firstUrl?.textContent).toContain(url);

    const kindLabels = within(results).getAllByTestId("search-result-kind");
    expect(kindLabels[0]?.textContent).toContain("Glossary");
  });
});
