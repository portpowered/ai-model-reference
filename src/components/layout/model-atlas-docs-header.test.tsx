import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelAtlasDocsHeader } from "@/components/layout/model-atlas-docs-header";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_LINK_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
  PRIMARY_NAV_MOBILE_PANEL_CLASS,
} from "@/components/layout/primary-nav";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localeOptions } from "@/lib/i18n/locale-routing";
import { assertPrimaryNavNoDuplicateSearchLink } from "@/lib/verify/customer-ask-home-header-convergence";
import {
  resetMockNavigation,
  setMockPathname,
} from "@/tests/a11y/mock-navigation";
import { renderWithAppProviders } from "@/tests/a11y/render";

describe("ModelAtlasDocsHeader", () => {
  afterEach(() => {
    cleanup();
    resetMockNavigation();
  });

  function withWindowLocation(
    location: Pick<Location, "pathname" | "search" | "hash"> &
      Partial<Pick<Location, "assign">>,
    run: () => Promise<void>,
  ): Promise<void> {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        ...location,
        assign: location.assign ?? originalLocation.assign,
      },
    });

    return run().finally(() => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });
  }

  test("renders header search trigger without duplicate /search primary nav link", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} />
      </RootProvider>,
    );

    expect(assertPrimaryNavNoDuplicateSearchLink(html)).toBeNull();

    const expectedItems = getPrimaryNavItems(messages);
    expect(expectedItems.map((item) => item.href)).toEqual([
      "/",
      "/docs/architecture",
      "/docs/glossary",
      "/tags",
    ]);

    for (const item of expectedItems) {
      expect(html).toContain(`href="${item.href}"`);
      expect(html).toContain(`>${item.label}<`);
    }

    expect(html).not.toMatch(
      /<nav\b[^>]*\baria-label="Primary"[^>]*>[\s\S]*href="\/search"/i,
    );
    expect(html).toContain('data-search=""');
    expect(html).toContain(`aria-label="${messages.search.open}"`);
    expect(html).toContain(messages.search.shortcut);
    expect(html).toContain(`aria-label="${messages.nav.language}"`);
    for (const option of localeOptions) {
      expect(html).toContain(`value="${option.code}"`);
      expect(html).toContain(option.label);
    }
  });

  test("renders the shared locale selector with the active locale selected", async () => {
    const messages = await loadUiMessages("vi");
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(
      <ModelAtlasDocsHeader messages={messages} locale="vi" />,
      {
        SearchDialog,
      },
    );

    const selector = screen.getByRole("combobox", {
      name: messages.nav.language,
    }) as HTMLSelectElement;
    expect(selector.value).toBe("vi");

    const options = within(selector).getAllByRole("option");
    expect(options).toHaveLength(localeOptions.length);
    expect(options.map((option) => option.textContent)).toEqual([
      "English",
      "Tiếng Việt (Hiện tại)",
      "日本語",
    ]);
  });

  test("marks unshipped locale destinations as unavailable and does not navigate to them", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const assignedUrls: string[] = [];

    await withWindowLocation(
      {
        assign: (url: string | URL) => {
          assignedUrls.push(String(url));
        },
        pathname: "/docs/modules/grouped-query-attention",
        search: "",
        hash: "",
      },
      async () => {
        setMockPathname("/docs/modules/grouped-query-attention");
        await renderWithAppProviders(
          <ModelAtlasDocsHeader messages={messages} locale="en" />,
          {
            SearchDialog,
          },
        );

        const selector = screen.getByRole("combobox", {
          name: messages.nav.language,
        }) as HTMLSelectElement;
        const options = within(selector).getAllByRole(
          "option",
        ) as HTMLOptionElement[];
        const japaneseOption = options.find((option) => option.value === "ja");

        expect(japaneseOption?.textContent).toBe("日本語 (Unavailable)");
        expect(japaneseOption?.hasAttribute("disabled")).toBe(true);
        expect(
          screen.getByText("Unavailable on this page: 日本語"),
        ).toBeTruthy();

        fireEvent.change(selector, {
          target: { value: "ja" },
        });

        expect(assignedUrls).toEqual([]);
      },
    );
  });

  test("switches to the localized equivalent route while preserving query and hash state", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const assignedUrls: string[] = [];

    await withWindowLocation(
      {
        assign: (url: string | URL) => {
          assignedUrls.push(String(url));
        },
        pathname: "/docs/modules/grouped-query-attention",
        search: "?view=graph",
        hash: "#kv-cache",
      },
      async () => {
        setMockPathname("/docs/modules/grouped-query-attention");
        await renderWithAppProviders(
          <ModelAtlasDocsHeader messages={messages} locale="en" />,
          {
            SearchDialog,
          },
        );

        fireEvent.change(
          screen.getByRole("combobox", { name: messages.nav.language }),
          {
            target: { value: "vi" },
          },
        );

        expect(assignedUrls).toEqual([
          "/vi/docs/modules/grouped-query-attention?view=graph#kv-cache",
        ]);
      },
    );
  });

  test("mobile width markup hides desktop inline nav links and exposes the menu control", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} />
      </RootProvider>,
    );

    expect(html).toContain(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS);
    expect(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS).toBe("md:hidden");
    expect(html).toContain(`aria-label="${messages.nav.menu}"`);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="');
    expect(html).not.toContain(PRIMARY_NAV_MOBILE_PANEL_CLASS);

    expect(html).toContain(PRIMARY_NAV_DESKTOP_CLASS);
    expect(PRIMARY_NAV_DESKTOP_CLASS).toContain("hidden");
    expect(PRIMARY_NAV_DESKTOP_CLASS).toContain("md:flex");

    const desktopNavMatch = html.match(
      new RegExp(
        `<nav class="${PRIMARY_NAV_DESKTOP_CLASS.replace(/ /g, "\\s+")}" aria-label="Primary">([\\s\\S]*?)</nav>`,
      ),
    );
    expect(desktopNavMatch).toBeTruthy();
    for (const item of getPrimaryNavItems(messages)) {
      expect(desktopNavMatch?.[1]).toContain(`href="${item.href}"`);
      expect(desktopNavMatch?.[1]).toContain(`>${item.label}<`);
    }

    expect(html).toContain('data-search=""');
  });

  test("desktop width markup renders inline nav links and hides the menu control", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} />
      </RootProvider>,
    );

    expect(html).toContain(PRIMARY_NAV_DESKTOP_CLASS);
    expect(PRIMARY_NAV_DESKTOP_CLASS).toContain("md:flex");

    const expectedItems = getPrimaryNavItems(messages);
    for (const item of expectedItems) {
      expect(html).toContain(`href="${item.href}"`);
      expect(html).toContain(`>${item.label}<`);
      expect(html).toContain(PRIMARY_NAV_LINK_CLASS);
    }

    expect(html).toContain(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS);
    expect(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS).toBe("md:hidden");
    expect(html).not.toContain(PRIMARY_NAV_MOBILE_PANEL_CLASS);
    expect(html).toContain('data-search=""');
  });

  test("reveals mobile primary nav links in a disclosure panel when the menu opens", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(<ModelAtlasDocsHeader messages={messages} />, {
      SearchDialog,
    });
    const menuButton = screen.getByRole("button", { name: messages.nav.menu });

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(menuButton.getAttribute("aria-controls")).toBeTruthy();

    fireEvent.click(menuButton);

    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    const panelId = menuButton.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();

    const panel = document.getElementById(panelId ?? "");
    expect(panel).toBeTruthy();
    expect(panel?.className).toContain(PRIMARY_NAV_MOBILE_PANEL_CLASS);

    const expectedItems = getPrimaryNavItems(messages);
    for (const item of expectedItems) {
      const link = within(panel as HTMLElement).getByRole("link", {
        name: item.label,
      });
      expect(link.getAttribute("href")).toBe(item.href);
    }
  });

  test("closes the mobile menu and hides the disclosure panel when toggled off", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(<ModelAtlasDocsHeader messages={messages} />, {
      SearchDialog,
    });
    const menuButton = screen.getByRole("button", { name: messages.nav.menu });

    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    expect(
      document.getElementById(menuButton.getAttribute("aria-controls") ?? ""),
    ).toBeTruthy();

    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(
      document.getElementById(menuButton.getAttribute("aria-controls") ?? ""),
    ).toBeNull();
  });

  test("exposes focus-visible ring classes on menu control, nav links, and search trigger", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} />
      </RootProvider>,
    );

    expect(html).toContain("focus-visible:ring-ring");
    expect(html).toContain(PRIMARY_NAV_LINK_CLASS);
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("focus-visible:ring-3");
  });

  test("moves keyboard focus through menu control, disclosed links, and search trigger when open", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(<ModelAtlasDocsHeader messages={messages} />, {
      SearchDialog,
    });
    const user = userEvent.setup();
    const menuButton = screen.getByRole("button", { name: messages.nav.menu });
    const languageSelector = screen.getByRole("combobox", {
      name: messages.nav.language,
    });
    const searchTrigger = screen.getByRole("button", {
      name: messages.search.open,
    });
    const expectedItems = getPrimaryNavItems(messages);

    await user.tab();
    expect(document.activeElement).toBe(menuButton);

    fireEvent.click(menuButton);

    const panelId = menuButton.getAttribute("aria-controls");
    const panel = document.getElementById(panelId ?? "");
    expect(panel).toBeTruthy();
    const panelLinks = within(panel as HTMLElement).getAllByRole("link");
    expect(panelLinks).toHaveLength(expectedItems.length);

    await user.tab();
    expect(document.activeElement).toBe(panelLinks[0]);

    for (const link of panelLinks.slice(1)) {
      await user.tab();
      expect(document.activeElement).toBe(link);
    }

    await user.tab();
    expect(document.activeElement).toBe(languageSelector);

    await user.tab();
    expect(document.activeElement).toBe(searchTrigger);
  });
});
