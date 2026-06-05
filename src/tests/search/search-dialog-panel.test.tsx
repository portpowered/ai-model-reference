import "@/tests/a11y/mock-navigation";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelAtlasSearchDialog } from "@/features/docs/search/SearchDialog";
import {
  captureOriginalFetch,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";
import { createDocsSearchRouteFetch } from "@/tests/search/route-fetch";

function renderSearchDialog(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
) {
  return renderWithAppProviders(
    <ModelAtlasSearchDialog
      open
      onOpenChange={() => {}}
      metaByUrl={context.metaByUrl}
      messages={context.messages}
    />,
    { context },
  );
}

/** Orama static search suspends on first client render; unmount + brief wait primes the cache. */
async function primeDocsSearchClient(
  context: Awaited<ReturnType<typeof loadAppTestContext>>,
): Promise<void> {
  const first = await renderSearchDialog(context);
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
  await renderSearchDialog(context);

  const dialog = await screen.findByRole("dialog", { name: "Search" });
  const user = userEvent.setup();
  const searchInput = within(dialog).getByRole("textbox");
  await user.type(searchInput, query);

  await waitFor(
    () => {
      const resultUrls = within(dialog).queryAllByTestId("search-result-url");
      expect(resultUrls.length).toBeGreaterThan(0);
      expect(
        resultUrls.some((node) =>
          node.textContent?.includes("/docs/modules/grouped-query-attention"),
        ),
      ).toBe(true);
    },
    { timeout: 3000 },
  );
}

describe("SearchDialog Phase 1 queries", () => {
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

  test("exposes idle state before query entry", async () => {
    const context = await loadAppTestContext();
    await renderSearchDialog(context);

    const dialog = await screen.findByRole("dialog", { name: "Search" });
    expect(
      within(dialog).getByTestId("search-dialog-idle").textContent,
    ).toContain(context.messages.search.idle);
  });

  test("exposes empty results state with accessible output semantics", async () => {
    const context = await loadAppTestContext();
    await renderSearchDialog(context);

    const dialog = await screen.findByRole("dialog", { name: "Search" });
    const user = userEvent.setup();
    const searchInput = within(dialog).getByRole("textbox");
    await user.type(searchInput, "zzzz-no-matches-zzzz");

    const empty = await within(dialog).findByTestId("search-dialog-empty");
    expect(empty.tagName).toBe("OUTPUT");
    expect(empty.textContent).toContain(context.messages.search.noResults);
  });
});
