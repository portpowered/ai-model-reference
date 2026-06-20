import "@/tests/a11y/mock-navigation";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  spyOn,
  test,
} from "bun:test";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelAtlasSearchDialog } from "@/features/docs/search/SearchDialog";
import { SearchPagePanelContent } from "@/features/docs/search/SearchPagePanel";
import {
  createStaticHandoffBootstrapFetch,
  STATIC_HANDOFF_BOOTSTRAP_FETCH_URL,
} from "@/lib/build/run-phase-1-static-handoff-search-checks";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  captureOriginalFetch,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";
import { SAMPLE_MODULE_URL } from "@/tests/search/helpers";
import { lockGlobalFetch } from "@/tests/shared/global-fetch-lock";

const STATIC_HANDOFF_CLIENT = { from: STATIC_HANDOFF_BOOTSTRAP_FETCH_URL };
const FAILING_BOOTSTRAP_URL = "http://static-handoff-fail.test/api/search";
const FAILING_BOOTSTRAP_CLIENT = { from: FAILING_BOOTSTRAP_URL };
const STATIC_EXPORT_EMPTY_HANDOFF = { q: null, tag: null } as const;
const defaultContextPromise = loadAppTestContext();
let staticHandoffBootstrapPayload: Awaited<
  ReturnType<Response["json"]>
> | null = null;
setDefaultTimeout(15_000);

function withWindowLocationSearch(
  search: string,
  run: () => Promise<void>,
): Promise<void> {
  const originalLocation = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...originalLocation,
      search,
      href: `http://localhost/search${search}`,
      reload: () => {},
    },
  });

  return run().finally(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
}

function installFailingBootstrapFetchMock(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url === FAILING_BOOTSTRAP_URL) {
      return new Response("missing", { status: 404 });
    }
    throw new Error(`Unexpected fetch URL in failing bootstrap test: ${url}`);
  }) as unknown as typeof fetch;
}

async function loadStaticHandoffBootstrapPayload() {
  if (staticHandoffBootstrapPayload !== null) {
    return staticHandoffBootstrapPayload;
  }

  staticHandoffBootstrapPayload = await (
    await docsSearchApi.staticGET()
  ).json();
  return staticHandoffBootstrapPayload;
}

async function installStaticHandoffFetchMock(): Promise<void> {
  globalThis.fetch = createStaticHandoffBootstrapFetch(
    await loadStaticHandoffBootstrapPayload(),
  );
}

function renderSearchPage(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
) {
  return renderWithAppProviders(
    <SearchPagePanelContent
      messages={context.messages}
      metaByUrl={context.metaByUrl}
      handoff={STATIC_EXPORT_EMPTY_HANDOFF}
      searchClient={STATIC_HANDOFF_CLIENT}
    />,
    { context },
  );
}

function renderSearchDialog(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
) {
  return renderWithAppProviders(
    <ModelAtlasSearchDialog
      open
      onOpenChange={() => {}}
      metaByUrl={context.metaByUrl}
      messages={context.messages}
      searchClient={STATIC_HANDOFF_CLIENT}
    />,
    { context },
  );
}

async function primeStaticHandoffSearch(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
  render: typeof renderSearchPage,
): Promise<void> {
  const first = await render(context);
  first.unmount();
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 400));
}

describe("static export search surfaces", () => {
  let releaseFetchLock: (() => void) | null = null;

  beforeAll(async () => {
    captureOriginalFetch();
    await lockGlobalFetch().then(async (release) => {
      releaseFetchLock = release;
      await installStaticHandoffFetchMock();
      const context = await defaultContextPromise;
      await primeStaticHandoffSearch(context, renderSearchPage);
      await primeStaticHandoffSearch(context, renderSearchDialog);
      restoreFetchMock();
      releaseFetchLock?.();
      releaseFetchLock = null;
    });
  });

  beforeEach(async () => {
    releaseFetchLock = await lockGlobalFetch();
    await installStaticHandoffFetchMock();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
    releaseFetchLock?.();
    releaseFetchLock = null;
  });

  test.each([
    "GQA",
    "attention",
    "KV cache",
  ] as const)("/search shows grouped-query attention for %s via static bootstrap", async (query) => {
    const context = await loadAppTestContext();
    await renderSearchPage(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      query,
    );

    const results = await screen.findByTestId("search-page-results");
    expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
  });

  test.each([
    "GQA",
    "attention",
    "KV cache",
  ] as const)("header dialog shows grouped-query attention for %s via static bootstrap", async (query) => {
    const context = await loadAppTestContext();
    await renderSearchDialog(context);

    const dialog = await screen.findByRole("dialog", { name: "Search" });
    const user = userEvent.setup();
    await user.type(within(dialog).getByRole("textbox"), query);

    await waitFor(
      () => {
        const resultUrls = within(dialog).queryAllByTestId("search-result-url");
        expect(
          resultUrls.some((node) =>
            node.textContent?.includes(SAMPLE_MODULE_URL),
          ),
        ).toBe(true);
      },
      { timeout: 3000 },
    );
  });

  test("/search?q=GQA prefills from window.location and surfaces grouped-query attention", async () => {
    const context = await loadAppTestContext();

    await withWindowLocationSearch("?q=GQA", async () => {
      await renderSearchPage(context);

      const searchInput = screen.getByLabelText(
        context.messages.search.placeholder,
      ) as HTMLInputElement;
      expect(searchInput.value).toBe("GQA");

      const results = await screen.findByTestId("search-page-results");
      expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
    });
  });

  test("/search?q=attention prefills from window.location and surfaces grouped-query attention", async () => {
    const context = await loadAppTestContext();

    await withWindowLocationSearch("?q=attention", async () => {
      await renderSearchPage(context);

      const searchInput = screen.getByLabelText(
        context.messages.search.placeholder,
      ) as HTMLInputElement;
      expect(searchInput.value).toBe("attention");

      const results = await screen.findByTestId("search-page-results");
      expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
    });
  });

  test("/search?tag=attention prefills from window.location and shows tag filter copy", async () => {
    const context = await loadAppTestContext();

    await withWindowLocationSearch("?tag=attention", async () => {
      await renderSearchPage(context);

      expect(
        screen.getByText(
          context.messages.searchEntry.tagFilterDescription.replace(
            "{tag}",
            "attention",
          ),
        ),
      ).toBeTruthy();

      const searchInput = screen.getByLabelText(
        context.messages.search.placeholder,
      ) as HTMLInputElement;
      expect(searchInput.value).toBe("attention");

      const results = await screen.findByTestId("search-page-results");
      expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
    });
  });

  test("/search?q=GQA&tag=attention prefers q over tag on static export handoff", async () => {
    const context = await loadAppTestContext();

    await withWindowLocationSearch("?q=GQA&tag=attention", async () => {
      await renderSearchPage(context);

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

      const results = await screen.findByTestId("search-page-results");
      expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);
    });
  });

  test("/search result rows are keyboard focusable after static bootstrap search", async () => {
    const context = await loadAppTestContext();
    await renderSearchPage(context);

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      "GQA",
    );

    const results = await screen.findByTestId("search-page-results");
    const firstRow = within(results).getAllByTestId("search-result-row")[0];
    expect(firstRow?.className).toContain("focus-visible:ring-2");
    firstRow?.focus();
    expect(document.activeElement).toBe(firstRow);
  });
});

describe("static export search bootstrap failures", () => {
  let releaseFetchLock: (() => void) | null = null;

  beforeAll(() => {
    captureOriginalFetch();
  });

  beforeEach(async () => {
    releaseFetchLock = await lockGlobalFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
    releaseFetchLock?.();
    releaseFetchLock = null;
  });

  test("/search exposes recoverable error when static bootstrap fetch fails", async () => {
    installFailingBootstrapFetchMock();
    const context = await loadAppTestContext();

    await renderWithAppProviders(
      <SearchPagePanelContent
        messages={context.messages}
        metaByUrl={context.metaByUrl}
        handoff={{ q: null, tag: null }}
        searchClient={FAILING_BOOTSTRAP_CLIENT}
      />,
      { context },
    );

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(context.messages.search.placeholder),
      "GQA",
    );

    const error = await screen.findByTestId("search-page-error");
    expect(error.textContent).toContain(context.messages.search.error);

    const reloadSpy = spyOn(window.location, "reload").mockImplementation(
      () => {},
    );
    await user.click(
      screen.getByRole("button", { name: context.messages.search.retry }),
    );
    expect(reloadSpy).toHaveBeenCalled();
    reloadSpy.mockRestore();
  });

  test("header dialog exposes recoverable error when static bootstrap fetch fails", async () => {
    installFailingBootstrapFetchMock();
    const context = await loadAppTestContext();

    await renderWithAppProviders(
      <ModelAtlasSearchDialog
        open
        onOpenChange={() => {}}
        metaByUrl={context.metaByUrl}
        messages={context.messages}
        searchClient={FAILING_BOOTSTRAP_CLIENT}
      />,
      { context },
    );

    const dialog = await screen.findByRole("dialog", { name: "Search" });
    const user = userEvent.setup();
    await user.type(within(dialog).getByRole("textbox"), "GQA");

    const error = await within(dialog).findByTestId("search-dialog-error");
    expect(error.textContent).toContain(context.messages.search.error);
  });
});
