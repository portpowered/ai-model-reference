import { describe, expect, test } from "bun:test";
import { localizeDocsHref } from "@/lib/content/localized-docs-href";

describe("localizeDocsHref", () => {
  test("keeps default-locale hrefs unchanged", () => {
    expect(localizeDocsHref("/docs/glossary/token", "en")).toBe(
      "/docs/glossary/token",
    );
  });

  test("localizes non-docs routes with locale-prefixed paths", () => {
    expect(localizeDocsHref("/tags/attention", "vi")).toBe(
      "/vi/tags/attention",
    );
    expect(localizeDocsHref("/search?tag=attention", "ja")).toBe(
      "/ja/search?tag=attention",
    );
  });

  test("localizes shipped docs routes", () => {
    expect(localizeDocsHref("/docs/glossary/token", "vi")).toBe(
      "/vi/docs/glossary/token",
    );
    expect(
      localizeDocsHref("/docs/modules/grouped-query-attention", "vi"),
    ).toBe("/vi/docs/modules/grouped-query-attention");
  });

  test("falls back to canonical docs routes for unshipped localized pages", () => {
    expect(localizeDocsHref("/docs/glossary/vector", "vi")).toBe(
      "/docs/glossary/vector",
    );
    expect(localizeDocsHref("/docs/modules/sparse-attention", "ja")).toBe(
      "/docs/modules/sparse-attention",
    );
  });

  test("preserves query strings while applying shipped locale gating", () => {
    expect(localizeDocsHref("/docs/glossary/token?tag=attention", "vi")).toBe(
      "/vi/docs/glossary/token?tag=attention",
    );
    expect(
      localizeDocsHref("/docs/modules/sparse-attention?tag=attention", "vi"),
    ).toBe("/docs/modules/sparse-attention?tag=attention");
  });
});
