import { describe, expect, test } from "bun:test";
import {
  SITE_COLLECTION_FAMILIES,
  SITE_NAMED_ROUTE_SURFACES,
  type SiteConfig,
} from "./site-config.contract";

const representativeSiteConfig = {
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
  primaryNav: [
    { routeSurface: "home", labelKey: "home" },
    { routeSurface: "topology", labelKey: "topology" },
    { routeSurface: "timeline", labelKey: "timeline" },
    { routeSurface: "tagsIndex", labelKey: "tags" },
  ],
  collections: SITE_COLLECTION_FAMILIES.map((family) => ({ family })),
  homeFeaturedLinks: [
    { kind: "route", routeSurface: "browse" },
    { kind: "docs-page", slug: "modules/grouped-query-attention" },
    { kind: "docs-page", slug: "modules/swiglu" },
    { kind: "docs-page", slug: "modules/relu" },
  ],
} satisfies SiteConfig;

describe("site config contract", () => {
  test("defines named route surfaces for current shell destinations", () => {
    expect(SITE_NAMED_ROUTE_SURFACES).toEqual([
      "home",
      "browse",
      "topology",
      "timeline",
      "tagsIndex",
    ]);
  });

  test("defines collection family placeholders for docs sections", () => {
    expect(SITE_COLLECTION_FAMILIES).toEqual([
      "glossary",
      "concepts",
      "modules",
      "models",
      "papers",
      "training",
      "systems",
    ]);
  });

  test("accepts a representative config shape with route, nav, and featured link placeholders", () => {
    expect(representativeSiteConfig.primaryNav).toHaveLength(4);
    expect(representativeSiteConfig.homeFeaturedLinks).toHaveLength(4);
    expect(representativeSiteConfig.collections).toHaveLength(
      SITE_COLLECTION_FAMILIES.length,
    );
    expect(representativeSiteConfig.routeSurfaces.timeline).toEqual({
      surface: "docs-page",
      slug: "timeline",
    });
  });
});
