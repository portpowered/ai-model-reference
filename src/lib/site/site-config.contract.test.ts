import { describe, expect, test } from "bun:test";
import type { SiteConfig } from "./site-config.contract";

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
  ],
} satisfies SiteConfig;

describe("site config contract", () => {
  test("accepts custom route surface ids for non-AI documentation sites", () => {
    expect(Object.keys(representativeLibrarySiteConfig.routeSurfaces)).toEqual([
      "landing",
      "catalog",
      "articles",
      "topics",
    ]);
    expect(representativeLibrarySiteConfig.homeRouteSurface).toBe("landing");
    expect(representativeLibrarySiteConfig.routeSurfaces.articles).toEqual({
      surface: "docs-page",
      slug: "articles",
    });
  });

  test("accepts arbitrary collection placeholder ids", () => {
    expect(
      representativeLibrarySiteConfig.collections.map((entry) => entry.id),
    ).toEqual(["books", "authors", "guides"]);
  });

  test("accepts message-backed and resolved featured home link copy bindings", () => {
    expect(representativeLibrarySiteConfig.homeFeaturedLinks).toEqual([
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
    ]);
  });

  test("keeps representative generic contract tests free of Model Atlas vocabulary", () => {
    const serializedConfig = JSON.stringify(representativeLibrarySiteConfig);

    expect(serializedConfig).not.toContain("topology");
    expect(serializedConfig).not.toContain("timeline");
    expect(serializedConfig).not.toContain("gqaLinkTitle");
    expect(serializedConfig).not.toContain("swigluLinkTitle");
    expect(serializedConfig).not.toContain("reluLinkTitle");
    expect(serializedConfig).not.toContain('"models"');
    expect(serializedConfig).not.toContain('"modules"');
    expect(serializedConfig).not.toContain('"papers"');
  });
});
