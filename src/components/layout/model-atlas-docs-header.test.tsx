import { afterEach, describe, expect, test } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentType, ReactNode } from "react";
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
import { assertPrimaryNavNoDuplicateSearchLink } from "@/lib/verify/customer-ask-home-header-convergence";
import { renderWithAppProviders } from "@/tests/a11y/render";
import { NextNavigationTestProvider } from "@/tests/a11y/next-navigation-test-provider";

function renderHeaderWithNavigation(
  ui: ReactNode,
  {
    SearchDialog,
    pathname = "/",
    searchParams = new URLSearchParams(),
  }: {
    SearchDialog: ComponentType<SharedProps>;
    pathname?: string;
    searchParams?: URLSearchParams;
  },
) {
  return render(
    <NextNavigationTestProvider pathname={pathname} searchParams={searchParams}>
      <RootProvider search={{ SearchDialog, enabled: true }}>{ui}</RootProvider>
    </NextNavigationTestProvider>,
  );
}

describe("ModelAtlasDocsHeader", () => {
  afterEach(() => {
    cleanup();
  });

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
    expect(html).toContain(`aria-label="${messages.language.open}"`);
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
    expect(document.activeElement).toBe(searchTrigger);
  });

  test("opens a language selector with locale-preserving links", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/docs/glossary/token?tag=attention");
    renderHeaderWithNavigation(<ModelAtlasDocsHeader messages={messages} />, {
      SearchDialog,
      pathname: "/docs/glossary/token",
      searchParams: new URLSearchParams("tag=attention"),
    });

    await user.click(
      screen.getByRole("button", { name: messages.language.open }),
    );

    const dialog = screen.getByRole("menu");

    expect(
      within(dialog)
        .getByRole("menuitem", { name: /English/i })
        .getAttribute("href"),
    ).toBe("/docs/glossary/token?tag=attention");
    expect(
      within(dialog)
        .getByRole("menuitem", { name: /Tieng Viet|Tiếng Việt/i })
        .getAttribute("href"),
    ).toBe("/vi/docs/glossary/token?tag=attention");
    expect(
      within(dialog).queryByRole("menuitem", { name: /Japanese/i }),
    ).toBeTruthy();
    expect(dialog.textContent).toContain(messages.language.unavailable);
  });

  test("shows unavailable locales for docs pages that are not shipped in that locale", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/docs/modules/sparse-attention");
    renderHeaderWithNavigation(<ModelAtlasDocsHeader messages={messages} />, {
      SearchDialog,
      pathname: "/docs/modules/sparse-attention",
    });

    await user.click(
      screen.getByRole("button", { name: messages.language.open }),
    );

    const dialog = screen.getByRole("menu");

    expect(
      within(dialog)
        .getByRole("menuitem", { name: /English/i })
        .getAttribute("href"),
    ).toBe("/docs/modules/sparse-attention");
    expect(
      within(dialog).queryByRole("menuitem", {
        name: /Tieng Viet|Tiếng Việt/i,
      }),
    ).toBeTruthy();
    expect(
      within(dialog).queryByRole("menuitem", { name: /Japanese/i }),
    ).toBeTruthy();
    expect(dialog.textContent).toContain(messages.language.unavailable);
  });
});
