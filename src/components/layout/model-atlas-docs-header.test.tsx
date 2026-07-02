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
  PRIMARY_NAV_MOBILE_LINK_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
} from "@/components/layout/primary-nav";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  MODEL_ATLAS_REPOSITORY_URL,
  modelAtlasSiteConfig,
} from "@/lib/site/model-atlas-site-config";
import type { SiteConfig } from "@/lib/site/site-config.contract";
import { source } from "@/lib/source";
import { assertPrimaryNavNoDuplicateSearchLink } from "@/lib/verify/customer-ask-home-header-convergence";
import {
  resetMockNavigation,
  setMockPathname,
  setMockSearchParams,
} from "@/tests/a11y/mock-navigation";
import { NextNavigationTestProvider } from "@/tests/a11y/next-navigation-test-provider";
import { renderWithAppProviders } from "@/tests/a11y/render";

const alternateSiteConfig = {
  brand: {
    scaffoldId: "example-scaffold",
    brandName: "Example Atlas",
    siteHeading: "Example Reference",
  },
  repositoryUrl: "https://github.com/example/example",
  routeSurfaces: {
    home: { surface: "home" },
    browse: { surface: "browse" },
    topology: { surface: "topology" },
    timeline: { surface: "docs-page", slug: "timeline" },
    tagsIndex: { surface: "tags-index" },
  },
  homeRouteSurface: "home",
  primaryNav: [
    { routeSurface: "home", labelKey: "home" },
    { routeSurface: "topology", labelKey: "topology" },
    { routeSurface: "timeline", labelKey: "timeline" },
    { routeSurface: "tagsIndex", labelKey: "tags" },
  ],
  collections: [
    { id: "glossary" },
    { id: "concepts" },
    { id: "modules" },
    { id: "models" },
    { id: "papers" },
    { id: "training" },
    { id: "systems" },
  ],
  homeFeaturedLinks: [
    {
      kind: "route",
      routeSurface: "browse",
      titleKey: "atlasLinkTitle",
      descriptionKey: "atlasLinkDescription",
    },
    {
      kind: "docs-page",
      slug: "modules/grouped-query-attention",
      titleKey: "gqaLinkTitle",
      descriptionKey: "gqaLinkDescription",
    },
    {
      kind: "docs-page",
      slug: "modules/swiglu",
      titleKey: "swigluLinkTitle",
      descriptionKey: "swigluLinkDescription",
    },
    {
      kind: "docs-page",
      slug: "modules/relu",
      titleKey: "reluLinkTitle",
      descriptionKey: "reluLinkDescription",
    },
  ],
} satisfies SiteConfig;

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
  setMockPathname(pathname);
  setMockSearchParams(searchParams);

  return render(
    <NextNavigationTestProvider pathname={pathname} searchParams={searchParams}>
      <RootProvider search={{ SearchDialog, enabled: true }}>{ui}</RootProvider>
    </NextNavigationTestProvider>,
  );
}

describe("ModelAtlasDocsHeader", () => {
  afterEach(() => {
    cleanup();
    resetMockNavigation();
  });

  test("renders header search trigger without duplicate /search primary nav link", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />
      </RootProvider>,
    );

    expect(assertPrimaryNavNoDuplicateSearchLink(html)).toBeNull();

    const expectedItems = getPrimaryNavItems(messages);
    expect(expectedItems.map((item) => item.href)).toEqual([
      "/",
      "/topology",
      "/docs/timeline",
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
    expect(html).toContain(`href="${MODEL_ATLAS_REPOSITORY_URL}"`);
    expect(html).toContain('aria-label="Open project GitHub repository"');
  });

  test("sources the repository link href from site config", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader
          messages={messages}
          pageTree={source.pageTree}
          siteConfig={alternateSiteConfig}
        />
      </RootProvider>,
    );

    expect(html).toContain('href="https://github.com/example/example"');
    expect(html).not.toContain(`href="${MODEL_ATLAS_REPOSITORY_URL}"`);
    expect(html).toContain('aria-label="Open project GitHub repository"');
    expect(html).toContain('title="Open project GitHub repository"');
  });

  test("keeps the default repository URL from model atlas site config", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader
          messages={messages}
          pageTree={source.pageTree}
          siteConfig={modelAtlasSiteConfig}
        />
      </RootProvider>,
    );

    expect(html).toContain(`href="${modelAtlasSiteConfig.repositoryUrl}"`);
    expect(modelAtlasSiteConfig.repositoryUrl).toBe(MODEL_ATLAS_REPOSITORY_URL);
  });

  test("mobile width markup hides desktop inline nav links and exposes the menu control", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />
      </RootProvider>,
    );

    expect(html).toContain(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS);
    expect(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS).toBe("md:hidden");
    expect(html).toContain(`aria-label="${messages.nav.menu}"`);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="');
    expect(PRIMARY_NAV_DESKTOP_CLASS).toContain("hidden");
    expect(PRIMARY_NAV_DESKTOP_CLASS).toContain("md:flex");

    const desktopNavMatch = html.match(
      /<nav[^>]*aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/,
    );
    expect(desktopNavMatch).toBeTruthy();
    for (const item of getPrimaryNavItems(messages)) {
      expect(desktopNavMatch?.[1]).toContain(`href="${item.href}"`);
      expect(desktopNavMatch?.[1]).toContain(`>${item.label}<`);
    }

    expect(html).toContain('data-search=""');
    expect(html).toContain("flex min-w-0 w-full items-center gap-2");
    expect(html).toContain("min-w-0 flex-1 md:flex-none");
    expect(html).toContain(
      "flex w-full min-w-0 items-center justify-between !px-4 !py-2 md:inline-flex md:w-auto md:justify-start md:!px-3 md:!py-1.5",
    );
  });

  test("desktop width markup renders inline nav links and hides the menu control", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />
      </RootProvider>,
    );

    expect(PRIMARY_NAV_DESKTOP_CLASS).toContain("md:flex");

    const expectedItems = getPrimaryNavItems(messages);
    for (const item of expectedItems) {
      expect(html).toContain(`href="${item.href}"`);
      expect(html).toContain(`>${item.label}<`);
      expect(html).toContain(PRIMARY_NAV_LINK_CLASS);
    }

    expect(html).toContain(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS);
    expect(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS).toBe("md:hidden");
    expect(html).toContain('data-search=""');
    expect(html).toContain("grid-cols-[auto_1fr]");
    expect(html).toContain("[--fd-layout-width:97rem]");
    expect(html).toContain("md:[--fd-sidebar-width:268px]");
    expect(html).toContain("xl:[--fd-toc-width:268px]");
    expect(html).toContain("max-w-[900px]");
    expect(html).toContain("max-w-[1168px]");
    expect(html).toContain(
      "md:col-start-3 md:col-end-4 md:row-start-1 md:block",
    );
  });

  test("keeps the simplified primary nav even when topology options are provided", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader
          messages={messages}
          pageTree={source.pageTree}
          topologyOptions={[]}
        />
      </RootProvider>,
    );

    const expectedItems = getPrimaryNavItems(messages);
    const desktopNavMatch = html.match(
      /<nav[^>]*aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/,
    );
    expect(desktopNavMatch).toBeTruthy();

    for (const item of expectedItems) {
      const escapedHref = item.href.replaceAll("&", "&amp;");
      expect(desktopNavMatch?.[1]).toContain(`href="${escapedHref}"`);
      expect(desktopNavMatch?.[1]).toContain(`>${item.label}<`);
    }

    expect(html).toContain("flex-wrap");
    expect(html).toContain("gap-y-2");
  });

  test("desktop action cluster does not intercept pointer events from inline nav links", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />
      </RootProvider>,
    );

    expect(html).toContain("pointer-events-none");
    expect(html).toContain("pointer-events-auto");
  });

  test("reveals mobile primary nav links in a disclosure panel when the menu opens", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(
      <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />,
      {
        SearchDialog,
      },
    );
    const menuButton = screen.getByRole("button", { name: messages.nav.menu });

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(menuButton.getAttribute("aria-controls")).toBeTruthy();

    fireEvent.click(menuButton);

    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    const panelId = menuButton.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();

    const drawer = document.getElementById(panelId ?? "");
    expect(drawer).toBeTruthy();
    expect(drawer?.getAttribute("role")).toBe("dialog");

    const expectedItems = getPrimaryNavItems(messages);
    for (const item of expectedItems) {
      const link = within(drawer as HTMLElement).getByRole("link", {
        name: item.label,
      });
      expect(link.getAttribute("href")).toBe(item.href);
    }
  });

  test("keeps the simplified mobile drawer nav when topology options are provided", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(
      <ModelAtlasDocsHeader
        messages={messages}
        pageTree={source.pageTree}
        topologyOptions={[]}
      />,
      {
        SearchDialog,
      },
    );
    const menuButton = screen.getByRole("button", { name: messages.nav.menu });

    fireEvent.click(menuButton);

    const drawer = document.getElementById(
      menuButton.getAttribute("aria-controls") ?? "",
    );
    expect(drawer).toBeTruthy();

    const expectedItems = getPrimaryNavItems(messages);
    for (const item of expectedItems) {
      const link = within(drawer as HTMLElement).getByRole("link", {
        name: item.label,
      });
      expect(link.getAttribute("href")).toBe(item.href);
      expect(link.className).toContain(PRIMARY_NAV_MOBILE_LINK_CLASS);
    }
  });

  test("renders localized simplified header labels on a vietnamese route", async () => {
    const messages = await loadUiMessages("vi");
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const html = renderToStaticMarkup(
      <RootProvider search={{ SearchDialog, enabled: true }}>
        <ModelAtlasDocsHeader
          messages={messages}
          pageTree={source.pageTree}
          locale="vi"
          topologyOptions={[]}
        />
      </RootProvider>,
    );

    const expectedItems = getPrimaryNavItems(messages, "vi");

    const desktopNavMatch = html.match(
      /<nav[^>]*aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/,
    );
    expect(desktopNavMatch).toBeTruthy();
    for (const item of expectedItems) {
      const escapedHref = item.href.replaceAll("&", "&amp;");
      expect(desktopNavMatch?.[1]).toContain(`href="${escapedHref}"`);
      expect(desktopNavMatch?.[1]).toContain(`>${item.label}<`);
    }
    expect(html).toContain(">Trang chủ<");
    expect(html).toContain(">Dòng thời gian<");
  });

  test("reveals localized mobile primary nav links when the menu opens on a vietnamese route", async () => {
    const messages = await loadUiMessages("vi");
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(
      <ModelAtlasDocsHeader
        messages={messages}
        pageTree={source.pageTree}
        locale="vi"
        topologyOptions={[]}
      />,
      {
        SearchDialog,
      },
    );
    const menuButton = screen.getByRole("button", { name: messages.nav.menu });

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(menuButton.getAttribute("aria-controls")).toBeTruthy();

    fireEvent.click(menuButton);

    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    const panelId = menuButton.getAttribute("aria-controls");
    const drawer = document.getElementById(panelId ?? "");
    expect(drawer).toBeTruthy();
    expect(drawer?.getAttribute("role")).toBe("dialog");

    const expectedItems = getPrimaryNavItems(messages, "vi");
    for (const item of expectedItems) {
      const link = within(drawer as HTMLElement).getByRole("link", {
        name: item.label,
      });
      expect(link.getAttribute("href")).toBe(item.href);
      expect(link.className).toContain(PRIMARY_NAV_MOBILE_LINK_CLASS);
    }
    expect(
      within(drawer as HTMLElement).getByRole("link", { name: "Trang chủ" }),
    ).toBeTruthy();
    expect(
      within(drawer as HTMLElement).getByRole("link", {
        name: "Dòng thời gian",
      }),
    ).toBeTruthy();
  });

  test("closes the mobile menu when a localized primary nav link is clicked", async () => {
    const messages = await loadUiMessages("vi");
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(
      <ModelAtlasDocsHeader
        messages={messages}
        pageTree={source.pageTree}
        locale="vi"
        topologyOptions={[]}
      />,
      {
        SearchDialog,
      },
    );
    const menuButton = screen.getByRole("button", { name: messages.nav.menu });

    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");

    const drawer = document.getElementById(
      menuButton.getAttribute("aria-controls") ?? "",
    );
    expect(drawer).toBeTruthy();

    const homeLink = within(drawer as HTMLElement).getByRole("link", {
      name: "Trang chủ",
    });
    fireEvent.click(homeLink);

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(
      document.getElementById(menuButton.getAttribute("aria-controls") ?? ""),
    ).toBeNull();
  });

  test("closes the mobile menu and hides the disclosure panel when toggled off", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    await renderWithAppProviders(
      <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />,
      {
        SearchDialog,
      },
    );
    const menuButton = screen.getByRole("button", { name: messages.nav.menu });

    fireEvent.click(menuButton);
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    const drawer = document.getElementById(
      menuButton.getAttribute("aria-controls") ?? "",
    );
    expect(drawer).toBeTruthy();

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
        <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />
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
    await renderWithAppProviders(
      <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />,
      {
        SearchDialog,
      },
    );
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
    const drawer = document.getElementById(panelId ?? "");
    expect(drawer).toBeTruthy();
    const primaryNav = within(drawer as HTMLElement).getByRole("navigation", {
      name: "Primary",
    });
    const panelLinks = within(primaryNav).getAllByRole("link");
    expect(panelLinks).toHaveLength(expectedItems.length);

    await user.tab();
    expect(document.activeElement).toBe(searchTrigger);
  });

  test("opens a language selector with locale-preserving links", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/docs/glossary/token?tag=attention");
    renderHeaderWithNavigation(
      <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />,
      {
        SearchDialog,
        pathname: "/docs/glossary/token",
        searchParams: new URLSearchParams("tag=attention"),
      },
    );

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
        .getByRole("menuitem", { name: /^Tiếng Việt$/i })
        .getAttribute("href"),
    ).toBe("/vi/docs/glossary/token?tag=attention");
    expect(
      within(dialog)
        .getByRole("menuitem", { name: /日本語/ })
        .getAttribute("href"),
    ).toBe("/ja/docs/glossary/token?tag=attention");
    expect(dialog.textContent).not.toContain(messages.language.unavailable);
  });

  test("keeps the language and GitHub header controls on the same outline button contract", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    renderHeaderWithNavigation(
      <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />,
      {
        SearchDialog,
      },
    );

    const languageButton = screen.getByRole("button", {
      name: messages.language.open,
    });
    const githubLink = screen.getByRole("link", {
      name: "Open project GitHub repository",
    });

    expect(languageButton.className).toContain("header-action-icon");
    expect(githubLink.className).toContain("header-action-icon");
    expect(languageButton.className).toContain("!border-border");
    expect(githubLink.className).toContain("!border-border");
    expect(languageButton.className).toContain("hover:!bg-[color-mix");
    expect(githubLink.className).toContain("hover:!bg-[color-mix");
  });

  test("shows unavailable locales for docs pages that are not shipped in that locale", async () => {
    const messages = await loadUiMessages();
    const SearchDialog: ComponentType<SharedProps> = () => null;
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/docs/modules/sparse-attention");
    renderHeaderWithNavigation(
      <ModelAtlasDocsHeader messages={messages} pageTree={source.pageTree} />,
      {
        SearchDialog,
        pathname: "/docs/modules/sparse-attention",
      },
    );

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
        name: /Tiếng Việt/,
      }),
    ).toBeTruthy();
    expect(
      within(dialog).queryByRole("menuitem", { name: /日本語/ }),
    ).toBeTruthy();
    expect(dialog.textContent).toContain(messages.language.unavailable);
  });
});
