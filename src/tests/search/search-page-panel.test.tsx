import "@/tests/a11y/mock-navigation";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPagePanelContent } from "@/features/docs/search/SearchPagePanel";
import {
  captureOriginalFetch,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";
import { createDocsSearchRouteFetch } from "@/tests/search/route-fetch";

function renderSearchPagePanelContent(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
  searchParams = new URLSearchParams(),
) {
  return renderWithAppProviders(
    <SearchPagePanelContent
      messages={context.messages}
      metaByUrl={context.metaByUrl}
      searchParams={searchParams}
    />,
    { context },
  );
}

/** Orama static search suspends on first client render; unmount + brief wait primes the cache. */
async function primeDocsSearchClient(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
): Promise<void> {
  const first = await renderSearchPagePanelContent(context);
  first.unmount();
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 400));
}

function installDocsSearchRouteFetch(): void {
  globalThis.fetch = createDocsSearchRouteFetch();
}

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

  const results = await screen.findByTestId("search-page-results");
  expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
}

describe("SearchPagePanel Phase 1 queries", () => {
  beforeAll(async () => {
    captureOriginalFetch();
    installDocsSearchRouteFetch();
    await primeDocsSearchClient(await loadAppTestContext());
  });

  beforeEach(() => {
    installDocsSearchRouteFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
  });

  test.each([
    "GQA",
    "attention",
    "KV cache",
  ] as const)("shows Grouped-Query Attention for %s query", async (query) => {
    const context = await loadAppTestContext();
    await typeQueryAndExpectGqaResult(context, query);
  });

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
