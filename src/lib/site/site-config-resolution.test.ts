import { describe, expect, test } from "bun:test";
import { isDocsPageShippedForLocale } from "@/lib/content/pages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import { modelAtlasSiteConfig } from "./model-atlas-site-config";
import type { SiteConfig } from "./site-config.contract";
import {
  resolveSiteConfigHomeFeaturedLinkHrefs,
  resolveSiteConfigHomeFeaturedLinks,
} from "./site-config-resolution";

const representativeLibrarySiteConfig = {
  brand: {
    scaffoldId: "library-reference",
    brandName: "Library Atlas",
    siteHeading: "Library Reference",
  },
  repositoryUrl: "https://github.com/example/library-reference",
  routeSurfaces: {
    landing: { surface: "home" },
    catalog: { surface: "browse" },
    articles: { surface: "docs-page", slug: "articles" },
    topics: { surface: "tags-index" },
  },
  homeRouteSurface: "landing",
  primaryNav: [
    { routeSurface: "landing", labelKey: "home" },
    { routeSurface: "catalog", labelKey: "catalog" },
    { routeSurface: "articles", labelKey: "articles" },
    { routeSurface: "topics", labelKey: "topics" },
  ],
  collections: [{ id: "books" }, { id: "authors" }, { id: "guides" }],
  homeFeaturedLinks: [
    {
      kind: "route",
      routeSurface: "catalog",
      titleKey: "catalogLinkTitle",
      descriptionKey: "catalogLinkDescription",
    },
    {
      kind: "docs-page",
      slug: "guides/getting-started",
      title: "Getting started",
      description: "A resolved featured link label for onboarding guides.",
    },
    {
      kind: "route",
      routeSurface: "topics",
      title: "Browse topics",
      description: "Resolved labels for the topics route surface.",
    },
  ],
} satisfies SiteConfig;

const representativeLibraryMessages = {
  home: {
    catalogLinkTitle: "Browse the catalog",
    catalogLinkDescription: "Explore every book in the library reference.",
  },
} as unknown as UiMessages;

describe("generic home featured link copy resolution", () => {
  test("resolves message-backed featured link copy from generic home message paths", () => {
    const [catalogLink] = resolveSiteConfigHomeFeaturedLinks(
      representativeLibrarySiteConfig,
      representativeLibraryMessages,
    );

    expect(catalogLink).toEqual({
      href: "/browse",
      title: "Browse the catalog",
      description: "Explore every book in the library reference.",
    });
  });

  test("renders resolved title and description labels without message lookup", () => {
    const [, resolvedDocsLink, resolvedRouteLink] =
      resolveSiteConfigHomeFeaturedLinks(
        representativeLibrarySiteConfig,
        representativeLibraryMessages,
      );

    expect(resolvedDocsLink).toEqual({
      href: "/docs/guides/getting-started",
      title: "Getting started",
      description: "A resolved featured link label for onboarding guides.",
    });
    expect(resolvedRouteLink).toEqual({
      href: "/tags",
      title: "Browse topics",
      description: "Resolved labels for the topics route surface.",
    });
  });

  test("resolves route featured links through any configured route surface id", () => {
    const hrefs = resolveSiteConfigHomeFeaturedLinkHrefs(
      representativeLibrarySiteConfig,
    );

    expect(hrefs).toEqual(["/browse", "/docs/guides/getting-started", "/tags"]);
  });

  test("fails when message-backed featured link copy keys are missing", () => {
    expect(() =>
      resolveSiteConfigHomeFeaturedLinks(representativeLibrarySiteConfig, {
        home: {},
      } as unknown as UiMessages),
    ).toThrow(
      'Home featured link copy is missing message title for key "catalogLinkTitle".',
    );
  });

  test("fails when route featured links reference an unknown route surface id", () => {
    const invalidConfig = {
      ...representativeLibrarySiteConfig,
      homeFeaturedLinks: [
        {
          kind: "route",
          routeSurface: "missing-surface",
          title: "Missing route",
          description: "This route surface is not configured.",
        },
      ],
    } satisfies SiteConfig;

    expect(() =>
      resolveSiteConfigHomeFeaturedLinks(
        invalidConfig,
        representativeLibraryMessages,
      ),
    ).toThrow(
      'Home featured link references unknown route surface "missing-surface".',
    );
  });

  test("fails when resolved featured link labels are empty", () => {
    const invalidConfig = {
      ...representativeLibrarySiteConfig,
      homeFeaturedLinks: [
        {
          kind: "docs-page",
          slug: "guides/getting-started",
          title: "",
          description: "Still missing a title label.",
        },
      ],
    } satisfies SiteConfig;

    expect(() =>
      resolveSiteConfigHomeFeaturedLinks(
        invalidConfig,
        representativeLibraryMessages,
      ),
    ).toThrow("Home featured link copy is missing resolved title label.");
  });
});

describe("site config home featured link resolution", () => {
  test("uses shipped-docs locale fallback for docs-page featured links", () => {
    const docsLinks = modelAtlasSiteConfig.homeFeaturedLinks.filter(
      (link) => link.kind === "docs-page",
    );

    for (const locale of ["vi", "ja"] as const) {
      for (const link of docsLinks) {
        const expectedLocale = isDocsPageShippedForLocale(link.slug, locale)
          ? locale
          : "en";

        const href = resolveSiteConfigHomeFeaturedLinkHrefs(
          modelAtlasSiteConfig,
          locale,
        )[modelAtlasSiteConfig.homeFeaturedLinks.indexOf(link)];

        if (expectedLocale === locale) {
          expect(href).toContain(`/${locale}/`);
        } else {
          expect(href).toMatch(/^\/docs\//);
          expect(href).not.toContain(`/${locale}/`);
        }
      }
    }
  });

  test("preserves localized browse and shipped module hrefs on vietnamese home", () => {
    expect(
      resolveSiteConfigHomeFeaturedLinkHrefs(modelAtlasSiteConfig, "vi"),
    ).toEqual([
      "/vi/browse",
      "/vi/docs/modules/grouped-query-attention",
      "/docs/modules/swiglu",
      "/docs/modules/relu",
    ]);
  });

  test("preserves localized browse and shipped module hrefs on japanese home", () => {
    expect(
      resolveSiteConfigHomeFeaturedLinkHrefs(modelAtlasSiteConfig, "ja"),
    ).toEqual([
      "/ja/browse",
      "/ja/docs/modules/grouped-query-attention",
      "/docs/modules/swiglu",
      "/docs/modules/relu",
    ]);
  });
});
