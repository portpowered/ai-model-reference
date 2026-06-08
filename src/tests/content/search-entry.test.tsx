import "@/tests/a11y/mock-navigation";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import SearchEntryPage from "@/app/(site)/search/page";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { assertSearchPageBuiltAppShell } from "@/lib/verify/phase-1-search-built-app-shell-checks";
import {
  captureOriginalFetch,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";
import { createDocsSearchRouteFetch } from "@/tests/search/route-fetch";

function installDocsSearchRouteFetch(): void {
  globalThis.fetch = createDocsSearchRouteFetch();
}

describe("search entry page messages", () => {
  it("loads localized title, description, and canonical path copy", async () => {
    const { searchEntry } = await loadUiMessages();
    expect(searchEntry.title).toBe("Search");
    expect(searchEntry.description.length).toBeGreaterThan(0);
    expect(searchEntry.canonicalNote).toContain("/search");
    expect(searchEntry.canonicalNote).toContain("?q=");
    expect(searchEntry.tagFilterDescription).toContain("{tag}");
    expect(searchEntry.emptySuggestionGqa).toBe("GQA");
    expect(
      searchEntry.emptySuggestionAttentionLinkLabel.length,
    ).toBeGreaterThan(0);
  });
});

describe("search entry page render", () => {
  it("renders accessible heading and inline search input shell", async () => {
    const html = renderToStaticMarkup(await SearchEntryPage());
    expect(assertSearchPageBuiltAppShell(html)).toBeNull();
  });
});

describe("search entry page built-app shell", () => {
  beforeAll(() => {
    captureOriginalFetch();
    installDocsSearchRouteFetch();
  });

  beforeEach(() => {
    installDocsSearchRouteFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
  });

  it("hydrates with exactly one title, search input, and canonical note", async () => {
    const context = await loadAppTestContext();
    const page = await SearchEntryPage();
    await renderWithAppProviders(page, { context });

    expect(
      screen.getAllByRole("heading", { level: 1, name: "Search" }),
    ).toHaveLength(1);
    expect(document.querySelectorAll("#search-page-input")).toHaveLength(1);
    expect(
      screen.getAllByText(context.messages.searchEntry.canonicalNote),
    ).toHaveLength(1);
    expect(screen.getByTestId("search-page-idle").textContent).toContain(
      context.messages.search.idle,
    );
  });

  it("keeps idle, results, and empty states in the results region below the input", async () => {
    const context = await loadAppTestContext();
    const page = await SearchEntryPage();
    const { container } = await renderWithAppProviders(page, { context });

    const input = screen.getByLabelText(context.messages.search.placeholder);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    if (!liveRegion) {
      throw new Error("expected aria-live results region on /search");
    }
    expect(
      input.compareDocumentPosition(liveRegion) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const user = userEvent.setup();
    await user.type(input, "GQA");
    const results = await screen.findByTestId("search-page-results");
    expect(liveRegion?.contains(results)).toBe(true);
    expect(results.textContent).toMatch(/Grouped-Query.*Attention/i);

    await user.clear(input);
    await user.type(input, "zzzz-no-matches-zzzz");
    const empty = await screen.findByTestId("search-page-empty");
    expect(liveRegion?.contains(empty)).toBe(true);
  });
});
