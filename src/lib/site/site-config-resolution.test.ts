import { describe, expect, test } from "bun:test";
import { isDocsPageShippedForLocale } from "@/lib/content/pages";
import { modelAtlasSiteConfig } from "./model-atlas-site-config";
import { resolveSiteConfigHomeFeaturedLinkHrefs } from "./site-config-resolution";

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
