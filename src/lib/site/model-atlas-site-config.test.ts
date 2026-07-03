import { describe, expect, test } from "bun:test";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  buildLocalizedRoute,
  defaultLocale,
  supportedLocales,
} from "@/lib/i18n/locale-routing";
import { SCAFFOLD_ID, SITE_BRAND_NAME, SITE_HEADING } from "@/lib/scaffold";
import {
  MODEL_ATLAS_COLLECTION_IDS,
  MODEL_ATLAS_REPOSITORY_URL,
  MODEL_ATLAS_ROUTE_SURFACES,
  modelAtlasSiteConfig,
} from "./model-atlas-site-config";
import {
  resolveSiteConfigHomeFeaturedLinkHrefs,
  resolveSiteConfigHomeFeaturedLinks,
  resolveSiteConfigPrimaryNavHrefs,
} from "./site-config-resolution";

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

describe("model atlas site config preserved behavior", () => {
  test("keeps route surface destinations for every configured surface id", () => {
    const expectedHrefsBySurface = {
      home: "/",
      browse: "/browse",
      topology: "/topology",
      timeline: "/docs/timeline",
      tagsIndex: "/tags",
    } as const;

    for (const routeSurface of MODEL_ATLAS_ROUTE_SURFACES) {
      expect(
        buildLocalizedRoute(
          modelAtlasSiteConfig.routeSurfaces[routeSurface],
          defaultLocale,
        ),
      ).toBe(expectedHrefsBySurface[routeSurface]);
    }
  });

  test("resolves primary nav to Home, Topology, Timeline, and Tags hrefs", async () => {
    const messages = await loadUiMessages();

    expect(
      resolveSiteConfigPrimaryNavHrefs(modelAtlasSiteConfig, defaultLocale),
    ).toEqual(["/", "/topology", "/docs/timeline", "/tags"]);
    expect(getPrimaryNavItems(messages).map((item) => item.label)).toEqual([
      "Home",
      "Topology",
      "Timeline",
      "Tags",
    ]);
  });

  test("preserves localized primary nav hrefs for supported locales", async () => {
    for (const locale of supportedLocales) {
      const messages = await loadUiMessages(locale);

      expect(
        resolveSiteConfigPrimaryNavHrefs(modelAtlasSiteConfig, locale),
      ).toEqual(getPrimaryNavItems(messages, locale).map((item) => item.href));
    }
  });

  test("resolves home featured links to Browse, Grouped-query attention, SwiGLU, and ReLU", async () => {
    const messages = await loadUiMessages();

    const links = resolveSiteConfigHomeFeaturedLinks(
      modelAtlasSiteConfig,
      messages,
      defaultLocale,
    );

    expect(links.map((link) => link.title)).toEqual([
      "Browse the atlas",
      "Grouped-query attention",
      "SwiGLU",
      "ReLU",
    ]);
    expect(
      resolveSiteConfigHomeFeaturedLinkHrefs(
        modelAtlasSiteConfig,
        defaultLocale,
      ),
    ).toEqual([
      "/browse",
      "/docs/modules/grouped-query-attention",
      "/docs/modules/swiglu",
      "/docs/modules/relu",
    ]);
  });

  test("preserves docs-page locale fallback for module featured links", () => {
    expect(
      resolveSiteConfigHomeFeaturedLinkHrefs(modelAtlasSiteConfig, "vi"),
    ).toEqual([
      "/vi/browse",
      "/vi/docs/modules/grouped-query-attention",
      "/docs/modules/swiglu",
      "/docs/modules/relu",
    ]);
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
