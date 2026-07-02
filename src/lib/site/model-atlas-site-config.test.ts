import { describe, expect, test } from "bun:test";
import { SCAFFOLD_ID, SITE_BRAND_NAME, SITE_HEADING } from "@/lib/scaffold";
import {
  MODEL_ATLAS_COLLECTION_IDS,
  MODEL_ATLAS_REPOSITORY_URL,
  modelAtlasSiteConfig,
} from "./model-atlas-site-config";

describe("model atlas site config", () => {
  test("contains current scaffold brand values", () => {
    expect(modelAtlasSiteConfig.brand).toEqual({
      scaffoldId: SCAFFOLD_ID,
      brandName: SITE_BRAND_NAME,
      siteHeading: SITE_HEADING,
    });
    expect(modelAtlasSiteConfig.brand.scaffoldId).toBe(
      "model-reference-scaffold",
    );
    expect(modelAtlasSiteConfig.brand.brandName).toBe("Model Atlas");
    expect(modelAtlasSiteConfig.brand.siteHeading).toBe("Model Reference");
  });

  test("contains current repository URL", () => {
    expect(modelAtlasSiteConfig.repositoryUrl).toBe(MODEL_ATLAS_REPOSITORY_URL);
    expect(modelAtlasSiteConfig.repositoryUrl).toBe(
      "https://github.com/portpowered/ai-model-reference",
    );
  });

  test("orders primary nav for home, topology, timeline, and tags", () => {
    expect(
      modelAtlasSiteConfig.primaryNav.map((entry) => entry.routeSurface),
    ).toEqual(["home", "topology", "timeline", "tagsIndex"]);
    expect(
      modelAtlasSiteConfig.primaryNav.map((entry) => entry.labelKey),
    ).toEqual(["home", "topology", "timeline", "tags"]);
  });

  test("includes all Model Atlas collection placeholders", () => {
    expect(modelAtlasSiteConfig.collections.map((entry) => entry.id)).toEqual([
      ...MODEL_ATLAS_COLLECTION_IDS,
    ]);
  });

  test("includes current home featured link placeholders", () => {
    expect(modelAtlasSiteConfig.homeFeaturedLinks).toEqual([
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
    ]);
  });
});
