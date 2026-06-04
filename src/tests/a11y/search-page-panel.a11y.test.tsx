import "./mock-navigation";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchPagePanel } from "@/features/docs/search/SearchPagePanel";
import { expectNoSeriousAxeViolations } from "@/tests/a11y/axe";
import { resetMockNavigation } from "@/tests/a11y/mock-navigation";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";

describe("search page panel accessibility smoke", () => {
  beforeAll(() => {
    captureOriginalFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
    resetMockNavigation();
  });

  test("exposes labeled query input, idle state for assistive tech, and no serious axe violations", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    const { container } = await renderWithAppProviders(
      <SearchPagePanel
        messages={context.messages}
        metaByUrl={context.metaByUrl}
      />,
      { context },
    );

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
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    const { container } = await renderWithAppProviders(
      <SearchPagePanel
        messages={context.messages}
        metaByUrl={context.metaByUrl}
      />,
      { context },
    );

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    );
    await user.type(searchInput, "zzzz-no-matches-zzzz");

    await waitFor(() => {
      expect(screen.getByTestId("search-page-empty")).toBeTruthy();
    });
    expect(screen.getByText(context.messages.search.noResults)).toBeTruthy();

    await expectNoSeriousAxeViolations(container);
  });

  test("exposes search results to assistive technology with no serious axe violations", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    const { container } = await renderWithAppProviders(
      <SearchPagePanel
        messages={context.messages}
        metaByUrl={context.metaByUrl}
      />,
      { context },
    );

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText(
      context.messages.search.placeholder,
    );
    await user.type(searchInput, "GQA");

    await waitFor(() => {
      expect(screen.getByTestId("search-page-results")).toBeTruthy();
    });

    await expectNoSeriousAxeViolations(container);
  });
});
