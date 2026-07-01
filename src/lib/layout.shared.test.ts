import { describe, expect, test } from "bun:test";
import { baseOptions } from "@/lib/layout.shared";
import { modelAtlasSiteConfig } from "@/lib/site/model-atlas-site-config";
import {
  SITE_COLLECTION_FAMILIES,
  type SiteConfig,
} from "@/lib/site/site-config.contract";

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
  primaryNav: [
    { routeSurface: "home", labelKey: "home" },
    { routeSurface: "topology", labelKey: "topology" },
    { routeSurface: "timeline", labelKey: "timeline" },
    { routeSurface: "tagsIndex", labelKey: "tags" },
  ],
  collections: SITE_COLLECTION_FAMILIES.map((family) => ({ family })),
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

describe("baseOptions", () => {
  test("sources the layout nav title from site config brand name", () => {
    expect(baseOptions().nav?.title).toBe(modelAtlasSiteConfig.brand.brandName);
    expect(baseOptions("en", alternateSiteConfig).nav?.title).toBe(
      "Example Atlas",
    );
  });

  test("resolves the default locale home route through site config", () => {
    expect(baseOptions("en").nav?.url).toBe("/");
  });

  test("preserves localized home route prefixes from site config", () => {
    expect(baseOptions("vi").nav?.url).toBe("/vi");
    expect(baseOptions("ja").nav?.url).toBe("/ja");
  });

  test("keeps search toggle disabled", () => {
    expect(baseOptions().searchToggle).toEqual({ enabled: false });
  });
});
