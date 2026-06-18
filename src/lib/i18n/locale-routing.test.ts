import { describe, expect, test } from "bun:test";
import {
  buildLocalizedRoute,
  defaultLocale,
  localizePath,
  matchLocalizedRoute,
  resolveLocale,
  supportedLocales,
  switchRouteLocale,
  UnsupportedLocaleError,
} from "./locale-routing";

describe("locale-routing", () => {
  test("exports the shared locale contract", () => {
    expect(supportedLocales).toEqual(["en", "vi", "ja"]);
    expect(defaultLocale).toBe("en");
  });

  test("resolveLocale defaults to english and rejects unsupported locales", () => {
    expect(resolveLocale()).toBe("en");
    expect(resolveLocale("vi")).toBe("vi");
    expect(resolveLocale("ja")).toBe("ja");
    expect(() => resolveLocale("fr")).toThrow(UnsupportedLocaleError);
  });

  test("localizePath preserves default english URLs and prefixes localized routes", () => {
    expect(localizePath("/", "en")).toBe("/");
    expect(localizePath("/", "vi")).toBe("/vi");
    expect(localizePath("/", "ja")).toBe("/ja");
    expect(localizePath("/search?tag=attention", "en")).toBe(
      "/search?tag=attention",
    );
    expect(localizePath("/search?tag=attention", "vi")).toBe(
      "/vi/search?tag=attention",
    );
    expect(localizePath("/search?tag=attention", "ja")).toBe(
      "/ja/search?tag=attention",
    );
  });

  test("buildLocalizedRoute covers the shipped surface contract", () => {
    expect(buildLocalizedRoute({ surface: "home" }, "en")).toBe("/");
    expect(buildLocalizedRoute({ surface: "home" }, "vi")).toBe("/vi");
    expect(buildLocalizedRoute({ surface: "home" }, "ja")).toBe("/ja");
    expect(buildLocalizedRoute({ surface: "search" }, "vi")).toBe("/vi/search");
    expect(buildLocalizedRoute({ surface: "search" }, "ja")).toBe("/ja/search");
    expect(
      buildLocalizedRoute(
        { surface: "docs-page", slug: "modules/grouped-query-attention" },
        "vi",
      ),
    ).toBe("/vi/docs/modules/grouped-query-attention");
    expect(
      buildLocalizedRoute(
        { surface: "docs-page", slug: "modules/grouped-query-attention" },
        "ja",
      ),
    ).toBe("/ja/docs/modules/grouped-query-attention");
    expect(buildLocalizedRoute({ surface: "architecture-index" }, "vi")).toBe(
      "/vi/docs/architecture",
    );
    expect(buildLocalizedRoute({ surface: "architecture-index" }, "ja")).toBe(
      "/ja/docs/architecture",
    );
    expect(buildLocalizedRoute({ surface: "glossary-index" }, "vi")).toBe(
      "/vi/docs/glossary",
    );
    expect(buildLocalizedRoute({ surface: "glossary-index" }, "ja")).toBe(
      "/ja/docs/glossary",
    );
    expect(buildLocalizedRoute({ surface: "tags-index" }, "vi")).toBe(
      "/vi/tags",
    );
    expect(buildLocalizedRoute({ surface: "tags-index" }, "ja")).toBe(
      "/ja/tags",
    );
    expect(
      buildLocalizedRoute({ surface: "tag-page", slug: "attention" }, "vi"),
    ).toBe("/vi/tags/attention");
    expect(
      buildLocalizedRoute({ surface: "tag-page", slug: "attention" }, "ja"),
    ).toBe("/ja/tags/attention");
  });

  test("matchLocalizedRoute resolves english defaults and localized prefixes", () => {
    expect(matchLocalizedRoute("/search")).toEqual({
      kind: "matched",
      locale: "en",
      pathname: "/search",
      destination: { surface: "search" },
    });

    expect(matchLocalizedRoute("/vi/docs/glossary")).toEqual({
      kind: "matched",
      locale: "vi",
      pathname: "/docs/glossary",
      destination: { surface: "glossary-index" },
    });

    expect(
      matchLocalizedRoute("/vi/docs/modules/grouped-query-attention"),
    ).toEqual({
      kind: "matched",
      locale: "vi",
      pathname: "/docs/modules/grouped-query-attention",
      destination: {
        surface: "docs-page",
        slug: "modules/grouped-query-attention",
      },
    });

    expect(matchLocalizedRoute("/ja/tags/attention")).toEqual({
      kind: "matched",
      locale: "ja",
      pathname: "/tags/attention",
      destination: {
        surface: "tag-page",
        slug: "attention",
      },
    });
  });

  test("matchLocalizedRoute flags unsupported locale prefixes instead of silently falling back", () => {
    expect(matchLocalizedRoute("/fr/search")).toEqual({
      kind: "unsupported-locale",
      locale: "fr",
      pathname: "/fr/search",
    });
  });

  test("switchRouteLocale preserves the requested destination", () => {
    expect(switchRouteLocale("/docs/glossary/token", "vi")).toBe(
      "/vi/docs/glossary/token",
    );
    expect(switchRouteLocale("/docs/glossary/token", "ja")).toBe(
      "/ja/docs/glossary/token",
    );
    expect(switchRouteLocale("/vi/tags/attention", "en")).toBe(
      "/tags/attention",
    );
    expect(switchRouteLocale("/vi/tags/attention", "ja")).toBe(
      "/ja/tags/attention",
    );
    expect(switchRouteLocale("/search?tag=attention", "vi")).toBe("/vi/search");
    expect(switchRouteLocale("/search?tag=attention", "ja")).toBe("/ja/search");
  });
});
