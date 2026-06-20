import "./mock-navigation";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPagePanelContent } from "@/features/docs/search/SearchPagePanel";
import { expectNoSeriousAxeViolations } from "@/tests/a11y/axe";
import { resetMockNavigation } from "@/tests/a11y/mock-navigation";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";

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

/** Orama static search suspends on first client render; unmount + brief wait primes the cache. */
async function primeDocsSearchClient(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
): Promise<void> {
  const first = await renderSearchPagePanelContent(context);
  first.unmount();
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 400));
}

describe("search page panel accessibility smoke", () => {
  beforeAll(async () => {
    captureOriginalFetch();
    await installDocsSearchFetchMock();
    await primeDocsSearchClient(await loadAppTestContext());
  });

  beforeEach(async () => {
    await installDocsSearchFetchMock();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
    resetMockNavigation();
  });

  test("exposes labeled query input, idle state for assistive tech, and no serious axe violations", async () => {
    const context = await loadAppTestContext();
    const { container } = await renderSearchPagePanelContent(context);

    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    );
    expect(searchInput).toBeTruthy();
    expect(screen.getByTestId("search-page-idle").textContent).toContain(
      context.messages.search.idle,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();

    await expectNoSeriousAxeViolations(container);
  });

  test("exposes empty results to assistive technology with no serious axe violations", async () => {
    const context = await loadAppTestContext();
    const { container } = await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    );
    await user.type(searchInput, "zzzz-no-matches-zzzz");

    await waitFor(() => {
      expect(screen.queryByTestId("search-page-loading")).toBeNull();
    });
    await screen.findByTestId("search-page-empty");
    expect(screen.getByText(context.messages.search.noResults)).toBeTruthy();

    await expectNoSeriousAxeViolations(container);
  });

  test("exposes search results to assistive technology with no serious axe violations", async () => {
    const context = await loadAppTestContext();
    const { container } = await renderSearchPagePanelContent(context);

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    );
    await user.type(searchInput, "GQA");

    await screen.findByTestId("search-page-results");

    await expectNoSeriousAxeViolations(container);
  });
});
