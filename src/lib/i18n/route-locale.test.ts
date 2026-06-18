import { describe, expect, test } from "bun:test";
import {
  generateStaticLocaleParams,
  localizedRouteAlternates,
  localizeStaticParams,
  resolveRouteLocaleOrNotFound,
} from "./route-locale";

describe("route-locale", () => {
  test("generates static locale params for every non-default locale", () => {
    expect(generateStaticLocaleParams()).toEqual([
      { locale: "vi" },
      { locale: "ja" },
    ]);
  });

  test("localizes static params for every non-default locale", () => {
    expect(localizeStaticParams([{ slug: "attention" }])).toEqual([
      { slug: "attention", locale: "vi" },
      { slug: "attention", locale: "ja" },
    ]);
  });

  test("publishes alternates for every supported locale", () => {
    expect(
      localizedRouteAlternates({
        surface: "docs-page",
        slug: "modules/grouped-query-attention",
      }),
    ).toEqual({
      canonical: "/docs/modules/grouped-query-attention",
      languages: {
        en: "/docs/modules/grouped-query-attention",
        vi: "/vi/docs/modules/grouped-query-attention",
        ja: "/ja/docs/modules/grouped-query-attention",
      },
    });
  });

  test("accepts japanese route locales", () => {
    expect(resolveRouteLocaleOrNotFound("ja")).toBe("ja");
  });
});
