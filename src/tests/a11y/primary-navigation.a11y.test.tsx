import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { act } from "react";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { ModelAtlasDocsHeader } from "@/components/layout/model-atlas-docs-header";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import { expectNoSeriousAxeViolations } from "@/tests/a11y/axe";
import {
  captureOriginalFetch,
  installDocsSearchFetchMock,
  loadAppTestContext,
  renderWithAppProviders,
  restoreFetchMock,
} from "@/tests/a11y/render";
import { resetMockNavigation, setMockPathname } from "./mock-navigation";

describe("primary navigation accessibility smoke", () => {
  beforeAll(() => {
    captureOriginalFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetchMock();
    resetMockNavigation();
  });

  test("exposes nav landmark, accessible link names, keyboard focus, and no serious axe violations", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages}>
          <p>Fixture page content</p>
        </CanonicalDocsLayout>,
        { context },
      );
    });

    const header = document.querySelector("header");
    expect(header).toBeTruthy();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeTruthy();

    const searchTrigger = header?.querySelector("[data-search]");
    expect(searchTrigger).toBeTruthy();

    const expectedItems = getPrimaryNavItems(context.messages);
    for (const item of expectedItems) {
      const link = within(nav).getByRole("link", { name: item.label });
      expect(link.getAttribute("href")).toBe(item.href);
    }

    for (const item of expectedItems) {
      const link = within(nav).getByRole("link", { name: item.label });
      link.focus();
      expect(document.activeElement).toBe(link);
    }

    const searchButton = screen.getByRole("button", {
      name: context.messages.search.open,
    });
    searchButton.focus();
    expect(document.activeElement).toBe(searchButton);

    await expectNoSeriousAxeViolations(header ?? document.body);
  });

  test("mobile menu open and close keeps accessible names and passes axe on the header region", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    await act(async () => {
      await renderWithAppProviders(
        <ModelAtlasDocsHeader messages={context.messages} />,
        { context },
      );
    });

    const header = document.querySelector("header");
    expect(header).toBeTruthy();

    const menuButton = screen.getByRole("button", {
      name: context.messages.nav.menu,
    });
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");

    menuButton.focus();
    expect(document.activeElement).toBe(menuButton);
    await expectNoSeriousAxeViolations(header ?? document.body);

    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    const panelId = menuButton.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId ?? "");
    expect(panel).toBeTruthy();

    const expectedItems = getPrimaryNavItems(context.messages);
    for (const item of expectedItems) {
      const link = within(panel as HTMLElement).getByRole("link", {
        name: item.label,
      });
      expect(link.getAttribute("href")).toBe(item.href);
      link.focus();
      expect(document.activeElement).toBe(link);
    }

    await expectNoSeriousAxeViolations(header ?? document.body);

    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(panelId ?? "")).toBeNull();
    await expectNoSeriousAxeViolations(header ?? document.body);
  });

  test("desktop inline primary navigation links remain keyboard focusable in docs layout", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    await act(async () => {
      await renderWithAppProviders(
        <CanonicalDocsLayout messages={context.messages}>
          <p>Fixture page content</p>
        </CanonicalDocsLayout>,
        { context },
      );
    });

    const header = document.querySelector("header");
    expect(header).toBeTruthy();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const expectedItems = getPrimaryNavItems(context.messages);

    for (const item of expectedItems) {
      const link = within(nav).getByRole("link", { name: item.label });
      expect(link.className).toContain("focus-visible:ring-ring");
      link.focus();
      expect(document.activeElement).toBe(link);
    }

    const menuButton = screen.queryByRole("button", {
      name: context.messages.nav.menu,
    });
    if (menuButton) {
      expect(menuButton.className).toContain("focus-visible:ring-ring");
    }

    await expectNoSeriousAxeViolations(header ?? document.body);
  });

  test("header exposes a keyboard-focusable language selector with the current locale selected", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    await act(async () => {
      await renderWithAppProviders(
        <ModelAtlasDocsHeader messages={context.messages} locale="ja" />,
        { context },
      );
    });

    const selector = screen.getByRole("combobox", {
      name: context.messages.nav.language,
    }) as HTMLSelectElement;
    const selectorLabel = selector.closest("div")?.querySelector("label");

    expect(selector.value).toBe("ja");
    expect(selector.getAttribute("id")).toBeTruthy();
    expect(selectorLabel?.tagName).toBe("LABEL");
    expect(selectorLabel?.getAttribute("for")).toBe(selector.id);

    const options = within(selector).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "English",
      "Tiếng Việt",
      "日本語 (Current)",
    ]);
    expect(options.map((option) => option.getAttribute("lang"))).toEqual([
      "en",
      "vi",
      "ja",
    ]);

    selector.focus();
    expect(document.activeElement).toBe(selector);

    const header = document.querySelector("header");
    await expectNoSeriousAxeViolations(header ?? document.body);
  });

  test("header exposes unavailable locale state with disabled semantics on unshipped docs routes", async () => {
    await installDocsSearchFetchMock();
    const context = await loadAppTestContext();
    setMockPathname("/docs/modules/grouped-query-attention");
    await act(async () => {
      await renderWithAppProviders(
        <ModelAtlasDocsHeader messages={context.messages} locale="en" />,
        { context },
      );
    });

    const selector = screen.getByRole("combobox", {
      name: context.messages.nav.language,
    });
    const options = within(selector).getAllByRole("option");
    const japaneseOption = options.find((option) =>
      option.textContent?.includes("日本語"),
    );
    const unavailableStatus = screen.getByText(
      "Unavailable on this page: 日本語",
    );

    expect(japaneseOption?.textContent).toBe("日本語 (Unavailable)");
    expect(japaneseOption?.hasAttribute("disabled")).toBe(true);
    expect(unavailableStatus.getAttribute("role")).toBe("status");
    expect(selector.getAttribute("aria-describedby")).toBe(
      unavailableStatus.id,
    );

    const header = document.querySelector("header");
    await expectNoSeriousAxeViolations(header ?? document.body);
  });
});
