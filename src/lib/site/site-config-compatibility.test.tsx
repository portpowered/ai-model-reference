import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeArticle } from "@/components/home/home-article";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  buildLocalizedRoute,
  defaultLocale,
  supportedLocales,
} from "@/lib/i18n/locale-routing";
import { SCAFFOLD_ID, SITE_BRAND_NAME, SITE_HEADING } from "@/lib/scaffold";
import {
  MODEL_ATLAS_REPOSITORY_URL,
  modelAtlasSiteConfig,
} from "./model-atlas-site-config";
import {
  resolveSiteConfigHomeFeaturedLinkHrefs,
  resolveSiteConfigHomeFeaturedLinks,
  resolveSiteConfigPrimaryNavHrefs,
} from "./site-config-resolution";

const PROJECT_GITHUB_URL = "https://github.com/portpowered/ai-model-reference";

function extractHrefAttributes(html: string): string[] {
  const hrefs: string[] = [];
  const pattern = /href="([^"]+)"/g;

  for (const match of html.matchAll(pattern)) {
    hrefs.push(match[1]);
  }

  return hrefs;
}

describe("site config scaffold compatibility", () => {
  test("keeps scaffold brand exports aligned with the default config", () => {
    expect(modelAtlasSiteConfig.brand.scaffoldId).toBe(SCAFFOLD_ID);
    expect(modelAtlasSiteConfig.brand.brandName).toBe(SITE_BRAND_NAME);
    expect(modelAtlasSiteConfig.brand.siteHeading).toBe(SITE_HEADING);
  });

  test("keeps the default repository URL aligned with the current header link", () => {
    expect(modelAtlasSiteConfig.repositoryUrl).toBe(MODEL_ATLAS_REPOSITORY_URL);
    expect(modelAtlasSiteConfig.repositoryUrl).toBe(PROJECT_GITHUB_URL);
  });

  test("keeps the default home route surface aligned with layout nav title link", () => {
    for (const locale of supportedLocales) {
      expect(
        buildLocalizedRoute(modelAtlasSiteConfig.routeSurfaces.home, locale),
      ).toBe(buildLocalizedRoute({ surface: "home" }, locale));
    }
  });
});

describe("site config primary nav compatibility", () => {
  test("resolves the same hrefs as getPrimaryNavItems for supported locales", async () => {
    const messages = await loadUiMessages();

    for (const locale of supportedLocales) {
      const configHrefs = resolveSiteConfigPrimaryNavHrefs(
        modelAtlasSiteConfig,
        locale,
      );
      const consumerHrefs = getPrimaryNavItems(messages, locale).map(
        (item) => item.href,
      );

      expect(configHrefs).toEqual(consumerHrefs);
    }
  });

  test("binds primary nav labels through the same message keys", async () => {
    const messages = await loadUiMessages();

    const configLabels = modelAtlasSiteConfig.primaryNav.map(
      (entry) => messages.nav[entry.labelKey],
    );
    const consumerLabels = getPrimaryNavItems(messages).map(
      (item) => item.label,
    );

    expect(configLabels).toEqual(consumerLabels);
  });
});

describe("site config home featured link compatibility", () => {
  test("resolves the same hrefs as HomeArticle for supported locales", async () => {
    const messages = await loadUiMessages();

    for (const locale of supportedLocales) {
      const configHrefs = resolveSiteConfigHomeFeaturedLinkHrefs(
        modelAtlasSiteConfig,
        locale,
      );
      const html = renderToStaticMarkup(
        <HomeArticle messages={messages} locale={locale} />,
      );
      const consumerHrefs = extractHrefAttributes(html).filter((href) =>
        configHrefs.includes(href),
      );

      expect(consumerHrefs).toEqual(configHrefs);
    }
  });

  test("preserves docs-page locale fallback behavior for module featured links", () => {
    const viHrefs = resolveSiteConfigHomeFeaturedLinkHrefs(
      modelAtlasSiteConfig,
      "vi",
    );
    const jaHrefs = resolveSiteConfigHomeFeaturedLinkHrefs(
      modelAtlasSiteConfig,
      "ja",
    );

    expect(viHrefs).toEqual([
      "/vi/browse",
      "/vi/docs/modules/grouped-query-attention",
      "/docs/modules/swiglu",
      "/docs/modules/relu",
    ]);
    expect(jaHrefs).toEqual([
      "/ja/browse",
      "/ja/docs/modules/grouped-query-attention",
      "/docs/modules/swiglu",
      "/docs/modules/relu",
    ]);
  });

  test("resolves default-locale browse and module links on the english surface", () => {
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

  test("binds featured link copy through the same home message keys", async () => {
    const messages = await loadUiMessages();

    const configLinks = resolveSiteConfigHomeFeaturedLinks(
      modelAtlasSiteConfig,
      messages,
    );
    const expectedCopy = modelAtlasSiteConfig.homeFeaturedLinks.map((link) => ({
      title: messages.home[link.titleKey],
      description: messages.home[link.descriptionKey],
    }));

    expect(
      configLinks.map(({ title, description }) => ({ title, description })),
    ).toEqual(expectedCopy);
    expect(configLinks.map((link) => link.title)).toEqual([
      "Browse the atlas",
      "Grouped-query attention",
      "SwiGLU",
      "ReLU",
    ]);
  });
});
