import "@/tests/a11y/mock-navigation";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPagePanelContent } from "@/features/docs/search/SearchPagePanel";
import {
  captureOriginalFetch,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";
import {
  collectResultUrlsFromNodes,
  expectCustomerAskSearchPagePanel,
  expectFullRowSearchResultHighlightPanel,
  expectReadableQueryMatchHighlightPanel,
  expectSharedSearchResultRowPanel,
  expectThinSearchMetadataPanel,
  expectUniqueCanonicalPageUrls,
  MULTI_HEAD_ATTENTION_URL,
  MULTI_QUERY_ATTENTION_URL,
  PREFILL_URL,
  resultsIncludeSampleModule,
  SAMPLE_MODULE_URL,
} from "@/tests/search/helpers";
import { createDocsSearchRouteFetch } from "@/tests/search/route-fetch";
import { lockGlobalFetch } from "@/tests/shared/global-fetch-lock";

setDefaultTimeout(15_000);

const SEARCH_PAGE_PANEL_RESULTS_TIMEOUT_MS = 15_000;

function toSearchPageHandoff(searchParams: URLSearchParams) {
  return {
    q: searchParams.get("q"),
    tag: searchParams.get("tag"),
    classification: searchParams.get("classification"),
  };
}

function renderSearchPagePanelContent(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
  searchParams = new URLSearchParams(),
) {
  return renderWithAppProviders(
    <SearchPagePanelContent
      messages={context.messages}
      metaByUrl={context.metaByUrl}
      handoff={toSearchPageHandoff(searchParams)}
    />,
    { context },
  );
}

async function waitForSearchPagePanelResults(
  options: { timeout?: number } = {},
): Promise<HTMLElement> {
  const timeout = options.timeout ?? SEARCH_PAGE_PANEL_RESULTS_TIMEOUT_MS;
  await waitFor(
    () => {
      expect(screen.queryByTestId("search-page-loading")).toBeNull();
    },
    { timeout },
  );
  return screen.findByTestId(
    "search-page-results",
    {},
    {
      timeout,
    },
  );
}

async function expectFirstSearchResultMatch(
  results: HTMLElement,
  expectations: { url?: string; titlePattern?: RegExp },
  options: { timeout?: number } = {},
): Promise<void> {
  const timeout = options.timeout ?? SEARCH_PAGE_PANEL_RESULTS_TIMEOUT_MS;
  await waitFor(
    () => {
      const firstRow = within(results).getAllByTestId("search-result-row")[0];
      const firstUrl = within(results).getAllByTestId("search-result-url")[0];
      if (expectations.url) {
        expect(firstUrl?.textContent).toContain(expectations.url);
      }
      if (expectations.titlePattern) {
        expect(firstRow?.textContent).toMatch(expectations.titlePattern);
      }
    },
    { timeout },
  );
}

/** Orama static search suspends on first client render; unmount + brief wait primes the cache. */
async function findSearchPageResults(timeout = 15_000): Promise<HTMLElement> {
  await waitFor(
    () => {
      expect(screen.queryByTestId("search-page-loading")).toBeNull();
    },
    { timeout },
  );
  return screen.findByTestId("search-page-results", {}, { timeout });
}

async function primeDocsSearchClient(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
  searchParams = new URLSearchParams(),
  options: { locale?: "ja" } = {},
): Promise<void> {
  const first =
    options.locale === "ja"
      ? await renderWithAppProviders(
          <SearchPagePanelContent
            messages={context.messages}
            metaByUrl={context.metaByUrl}
            handoff={toSearchPageHandoff(searchParams)}
            locale="ja"
          />,
          { context },
        )
      : await renderSearchPagePanelContent(context, searchParams);

  if ([...searchParams.keys()].length > 0) {
    await waitForSearchPagePanelResults();
  }

  first.unmount();
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 400));
}

function installDocsSearchRouteFetch(): void {
  globalThis.fetch = createDocsSearchRouteFetch();
}

const JAPANESE_ATTENTION_PROOF_SET_URLS = [
  "/ja/docs/modules/attention",
  "/ja/docs/modules/linear-attention",
  "/ja/docs/modules/multi-head-attention",
  "/ja/docs/modules/grouped-query-attention",
  "/ja/docs/modules/multi-query-attention",
  "/ja/docs/modules/sliding-window-attention",
  "/ja/docs/glossary/token",
  "/ja/docs/concepts/transformer-architecture",
] as const;

async function typeQueryAndExpectGqaResult(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
  query: string,
): Promise<void> {
  await renderSearchPagePanelContent(context);

  const user = userEvent.setup();
  const searchInput = screen.getByLabelText(
    context.messages.search.placeholder,
  );
  await user.type(searchInput, query);

  const results = await waitForSearchPagePanelResults({
    timeout: 30_000,
  });
  await waitFor(
    () => {
      expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
    },
    { timeout: 30_000 },
  );
}

describe("SearchPagePanel Phase 1 queries", () => {
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

  test.each(["GQA", "attention", "KV cache"] as const)(
    "shows Grouped-Query Attention for %s query",
    async (query) => {
      const context = await loadAppTestContext();
      await typeQueryAndExpectGqaResult(context, query);
    },
    { timeout: 30_000 },
  );

  test.each([
    "GQA",
    "attention",
    "KV cache",
  ] as const)("passes customer-ask page-level hit checks for %s query", async (query) => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      query,
    );

    const results = await screen.findByTestId(
      "search-page-results",
      {},
      { timeout: 15_000 },
    );
    expectCustomerAskSearchPagePanel(within(results), query);
  });

  test.each([
    "GQA",
    "attention",
    "KV cache",
  ] as const)("returns at most one row per canonical page URL for %s query", async (query) => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    );
    await user.type(searchInput, query);

    const results = await screen.findByTestId(
      "search-page-results",
      {},
      { timeout: 15_000 },
    );
    const resultUrls = within(results).getAllByTestId("search-result-url");
    expect(resultUrls.length).toBeGreaterThan(0);
    const urls = collectResultUrlsFromNodes(resultUrls);
    expectUniqueCanonicalPageUrls(urls);
    expect(resultsIncludeSampleModule(urls.map((url) => ({ url })))).toBe(true);
  });

  test("GQA query renders bulletless search results list without list-disc", async () => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      "GQA",
    );

    const results = await screen.findByTestId("search-page-results");
    expect(results.className).toContain("list-none");
    expect(results.className).not.toContain("list-disc");
    expect(results.querySelectorAll("li").length).toBeGreaterThan(0);
  });

  test("GQA query renders page hits through shared SearchResultRow", async () => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      "GQA",
    );

    const results = await screen.findByTestId("search-page-results");
    expectSharedSearchResultRowPanel(within(results));
  });

  test("GQA query shows thin metadata without matched-tag chips", async () => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      "GQA",
    );

    const results = await screen.findByTestId("search-page-results");
    expectThinSearchMetadataPanel(within(results), { expectSummary: true });
  });

  test("GQA query highlights full result rows including metadata on hover and focus", async () => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      "GQA",
    );

    const results = await screen.findByTestId("search-page-results");
    expectFullRowSearchResultHighlightPanel(within(results));
    const row = within(results).getAllByTestId("search-result-row")[0];
    expect(row?.className).toContain("hover:bg-accent");
    expect(row?.className).toContain("focus-visible:ring-2");
  });

  test("Grouped query keeps query-match marks readable on accent rows on /search", async () => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      "Grouped",
    );

    const results = await screen.findByTestId("search-page-results");
    expectReadableQueryMatchHighlightPanel(within(results));
  });

  test("GQA query ranks grouped-query attention first on /search", async () => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      "GQA",
    );

    const results = await waitForSearchPagePanelResults();
    await expectFirstSearchResultMatch(results, { url: SAMPLE_MODULE_URL });
  });

  test.each([
    "prefill",
    "prompt processing",
    "prompt pass",
  ] as const)("%s query ranks the canonical prefill concept page first on /search", async (query) => {
    const context = await loadAppTestContext();
    await renderSearchPagePanelContent(
      context,
      new URLSearchParams({ q: query }),
    );

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe(query);

    const results = await waitForSearchPagePanelResults();
    await expectFirstSearchResultMatch(results, {
      url: PREFILL_URL,
      titlePattern: /prefill/i,
    });
  }, { timeout: 30_000 });

  test.each([
    {
      query: "MHA",
      url: MULTI_HEAD_ATTENTION_URL,
      title: /Multi-Head.*Attention/i,
    },
    {
      query: "MQA",
      url: MULTI_QUERY_ATTENTION_URL,
      title: /Multi-Query.*Attention/i,
    },
  ] as const)(
    "%s query ranks the matching attention variant first on /search",
    async ({ query, url, title }) => {
      const context = await loadAppTestContext();
      await renderSearchPagePanelContent(context);

      const user = userEvent.setup();
      await user.type(
        screen.getByLabelText(context.messages.search.placeholder),
        query,
      );

      const results = await waitForSearchPagePanelResults({
        timeout: 30_000,
      });
      await expectFirstSearchResultMatch(
        results,
        {
          url: url,
          titlePattern: title,
        },
        { timeout: 30_000 },
      );
    },
    { timeout: 30_000 },
  );

  test("exposes idle state with aria-live region before query entry", async () => {
    const context = await loadAppTestContext();
    const { container } = await renderSearchPagePanelContent(context);

    expect(screen.getByTestId("search-page-idle").textContent).toContain(
      context.messages.search.idle,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.querySelector("output")).toBeTruthy();
  });

  test("exposes empty results state with accessible output semantics", async () => {
    const context = await loadAppTestContext();
    const { container } = await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    );
    await user.type(searchInput, "zzzz-no-matches-zzzz");

    const empty = await screen.findByTestId("search-page-empty");
    expect(empty.tagName).toBe("OUTPUT");
    expect(screen.getByText(context.messages.search.noResults)).toBeTruthy();

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });
});

describe("SearchPagePanel query handoff", () => {
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

  test("/search?q=GQA prefills GQA and surfaces grouped-query attention", async () => {
    const context = await loadAppTestContext();
    const searchParams = new URLSearchParams("q=GQA");
    await renderSearchPagePanelContent(context, searchParams);

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("GQA");

    const results = await waitForSearchPagePanelResults();
    expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
  });

  test("prefers q over tag when both params are present", async () => {
    const context = await loadAppTestContext();
    const searchParams = new URLSearchParams("q=GQA&tag=attention");
    await renderSearchPagePanelContent(context, searchParams);

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("GQA");

    expect(
      screen.queryByText(
        context.messages.searchEntry.tagFilterDescription.replace(
          "{tag}",
          "attention",
        ),
      ),
    ).toBeNull();
  });

  test("applies q handoff when params arrive after an empty initial render", async () => {
    const context = await loadAppTestContext();
    const view = await renderSearchPagePanelContent(
      context,
      new URLSearchParams(),
    );

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("");
    expect(screen.getByTestId("search-page-idle")).toBeTruthy();

    view.rerender(
      <SearchPagePanelContent
        messages={context.messages}
        metaByUrl={context.metaByUrl}
        handoff={{ q: "GQA", tag: null, classification: null }}
      />,
    );

    await waitFor(() => {
      expect(searchInput.value).toBe("GQA");
    });
    expect(screen.queryByTestId("search-page-idle")).toBeNull();
    const results = await waitForSearchPagePanelResults();
    expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
  });
});

describe("SearchPagePanel classification handoff", () => {
  let releaseFetchLock: (() => void) | null = null;

  beforeAll(async () => {
    captureOriginalFetch();
    await lockGlobalFetch().then(async (release) => {
      releaseFetchLock = release;
      installDocsSearchRouteFetch();
      await primeDocsSearchClient(
        await loadAppTestContext(),
        new URLSearchParams("q=token&classification=unknown-topic"),
      );
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

  test("/search?classification=activation prefills activation and surfaces activation-family results", async () => {
    const context = await loadAppTestContext();
    const searchParams = new URLSearchParams("classification=activation");
    await renderSearchPagePanelContent(context, searchParams);

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("activation");
    expect(
      screen.getByText(
        context.messages.searchEntry.classificationScopeDescription.replace(
          "{classification}",
          "activation-functions",
        ),
      ),
    ).toBeTruthy();

    const results = await findSearchPageResults();
    expect(results.textContent).toMatch(/ReLU/i);
  });

  test("/search?q=relu&classification=activation preserves q and shows the classification scope", async () => {
    const context = await loadAppTestContext();
    const searchParams = new URLSearchParams(
      "q=relu&classification=activation",
    );
    await renderSearchPagePanelContent(context, searchParams);

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("relu");
    expect(
      screen.getByText(
        context.messages.searchEntry.classificationScopeDescription.replace(
          "{classification}",
          "activation-functions",
        ),
      ),
    ).toBeTruthy();

    const results = await findSearchPageResults();
    expect(results.textContent).toMatch(/ReLU/i);
  });

  test("/search?classification=unknown-topic falls back to the existing empty state", async () => {
    const context = await loadAppTestContext();
    const searchParams = new URLSearchParams("classification=unknown-topic");
    await renderSearchPagePanelContent(context, searchParams);

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("unknown-topic");

    const empty = await screen.findByTestId(
      "search-page-empty",
      {},
      { timeout: 15_000 },
    );
    expect(empty.textContent).toContain(context.messages.search.noResults);
    expect(
      screen.queryByText(
        context.messages.searchEntry.classificationScopeDescription.replace(
          "{classification}",
          "unknown-topic",
        ),
      ),
    ).toBeNull();
  });

  test("/search?q=token&classification=unknown-topic falls back to unscoped results without a scope banner", async () => {
    const context = await loadAppTestContext();
    const searchParams = new URLSearchParams(
      "q=token&classification=unknown-topic",
    );
    const prime = await renderSearchPagePanelContent(context, searchParams);
    prime.unmount();
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 400));

    await renderSearchPagePanelContent(context, searchParams);

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("token");

    const results = await findSearchPageResults();
    expect(results.textContent).toMatch(/Token/i);
    expect(
      screen.queryByText(
        context.messages.searchEntry.classificationScopeDescription.replace(
          "{classification}",
          "unknown-topic",
        ),
      ),
    ).toBeNull();
  });
});

describe("SearchPagePanel tag handoff", () => {
  let releaseFetchLock: (() => void) | null = null;

  beforeAll(async () => {
    captureOriginalFetch();
    await lockGlobalFetch().then(async (release) => {
      releaseFetchLock = release;
      installDocsSearchRouteFetch();
      const englishContext = await loadAppTestContext();
      await primeDocsSearchClient(
        englishContext,
        new URLSearchParams("tag=attention"),
      );
      await primeDocsSearchClient(
        await loadAppTestContext("ja"),
        new URLSearchParams("tag=attention"),
        { locale: "ja" },
      );
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

  test(
    "/search?tag=attention prefills attention and surfaces grouped-query attention",
    async () => {
      const context = await loadAppTestContext();
      const searchParams = new URLSearchParams("tag=attention");
      await renderSearchPagePanelContent(context, searchParams);

      const searchInput = screen.getByLabelText(
        context.messages.search.placeholder,
      ) as HTMLInputElement;
      expect(searchInput.value).toBe("attention");

      const results = await waitForSearchPagePanelResults({
        timeout: 30_000,
      });
      expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
    },
    { timeout: 30_000 },
  );

  test("shows tag filter description when tag param is present without q", async () => {
    const context = await loadAppTestContext();
    const searchParams = new URLSearchParams("tag=attention");
    await renderSearchPagePanelContent(context, searchParams);

    expect(
      screen.getByText(
        context.messages.searchEntry.tagFilterDescription.replace(
          "{tag}",
          "attention",
        ),
      ),
    ).toBeTruthy();
  });

  test("renders the japanese shipped attention proof set with locale-aware copy and urls", async () => {
    const context = await loadAppTestContext("ja");
    const searchParams = new URLSearchParams("tag=attention");
    await renderWithAppProviders(
      <SearchPagePanelContent
        messages={context.messages}
        metaByUrl={context.metaByUrl}
        handoff={toSearchPageHandoff(searchParams)}
        locale="ja"
      />,
      { context },
    );

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    ) as HTMLInputElement;
    expect(searchInput.value).toBe("attention");
    expect(searchInput.placeholder).toBe(context.messages.search.placeholder);
    expect(
      screen.getByText(
        context.messages.searchEntry.tagFilterDescription.replace(
          "{tag}",
          "attention",
        ),
      ),
    ).toBeTruthy();

    const results = await findSearchPageResults();
    const urls = collectResultUrlsFromNodes(
      within(results).getAllByTestId("search-result-url"),
    );

    expect(urls).toHaveLength(JAPANESE_ATTENTION_PROOF_SET_URLS.length);
    expect([...urls].sort()).toEqual(
      [...JAPANESE_ATTENTION_PROOF_SET_URLS].sort(),
    );
    expect(results.textContent).toContain("最小の文字単位");
    expect(results.textContent).toContain("Transformer アーキテクチャ");
    expect(results.textContent).not.toContain(
      "/ja/docs/modules/sparse-attention",
    );
  });
});
