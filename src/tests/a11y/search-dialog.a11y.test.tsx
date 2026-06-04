import "./mock-navigation";
import { afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import { ModelAtlasSearchDialog } from "@/features/docs/search/SearchDialog";
import { expectNoSeriousAxeViolations } from "@/tests/a11y/axe";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";

describe("search dialog accessibility smoke", () => {
  beforeAll(() => {
    captureOriginalFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
  });

  test("exposes dialog roles, labeled search input, idle copy, and no serious axe violations", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    await renderWithAppProviders(
      <ModelAtlasSearchDialog
        open
        onOpenChange={() => {}}
        metaByUrl={context.metaByUrl}
        messages={context.messages}
      />,
      { context },
    );

    const dialog = await waitFor(() =>
      screen.getByRole("dialog", { name: "Search" }),
    );
    const searchInput = within(dialog).getByRole("textbox");
    expect(searchInput.getAttribute("placeholder")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId("search-dialog-idle").textContent).toContain(
        context.messages.search.idle,
      );
    });

    await expectNoSeriousAxeViolations(dialog);
  });

  test("shows loading copy while search is in flight and passes axe", async () => {
    const context = await loadAppTestContext();
    const searchClient = await import("@/features/docs/search/search-client");
    const useSearchSpy = spyOn(
      searchClient,
      "useModelAtlasDocsSearch",
    ).mockReturnValue({
      search: "GQA",
      setSearch: () => {},
      query: {
        isLoading: true,
        data: undefined,
      },
    } as unknown as ReturnType<typeof searchClient.useModelAtlasDocsSearch>);

    try {
      await renderWithAppProviders(
        <ModelAtlasSearchDialog
          open
          onOpenChange={() => {}}
          metaByUrl={context.metaByUrl}
          messages={context.messages}
        />,
        { context },
      );

      const dialog = screen.getByRole("dialog", { name: "Search" });
      within(dialog).getByRole("textbox");
      const loading = screen.getByTestId("search-dialog-loading");
      expect(loading.textContent).toContain(context.messages.search.loading);

      await expectNoSeriousAxeViolations(dialog);
    } finally {
      useSearchSpy.mockRestore();
    }
  });
});
