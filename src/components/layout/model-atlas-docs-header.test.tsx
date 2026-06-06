import { afterEach, describe, expect, test } from "bun:test";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { RootProvider } from "fumadocs-ui/provider/next";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelAtlasDocsHeader } from "@/components/layout/model-atlas-docs-header";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
  PRIMARY_NAV_MOBILE_PANEL_CLASS,
} from "@/components/layout/primary-nav";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { assertPrimaryNavNoDuplicateSearchLink } from "@/lib/verify/customer-ask-home-header-convergence";
import { renderWithAppProviders } from "@/tests/a11y/render";

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
  });

  test("exposes responsive primary navigation markup for mobile and desktop widths", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} />
      </RootProvider>,
    );

    expect(html).toContain(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS);
    expect(html).toContain(`aria-label="${messages.nav.menu}"`);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(PRIMARY_NAV_DESKTOP_CLASS);
    expect(html).not.toContain(PRIMARY_NAV_MOBILE_PANEL_CLASS);
    expect(html).toContain('data-search=""');
  });

  test("reveals mobile primary nav links in a disclosure panel when the menu opens", async () => {
    const messages = await loadUiMessages();
    await renderWithAppProviders(
      <ModelAtlasDocsHeader messages={messages} />,
    );
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
});
