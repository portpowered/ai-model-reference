import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { HomeArticle } from "@/components/home/home-article";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import { resolveInitialSearchPageQuery } from "@/features/docs/search/search-page-query";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
import { expectHomeArticleHeaderOnlySearchEntry } from "@/tests/discovery/home-search-entry-contract";
import { resultsIncludeSampleModule } from "@/tests/search/helpers";

describe("search page query prefill", () => {
  it("prefers q over tag when both are present", () => {
    expect(resolveInitialSearchPageQuery("GQA", "attention")).toBe("GQA");
  });

  it("seeds attention from tag when q is absent", () => {
    expect(resolveInitialSearchPageQuery(null, "attention")).toBe("attention");
  });

  it("returns empty when neither param is set", () => {
    expect(resolveInitialSearchPageQuery(null, null)).toBe("");
  });
});

describe("Phase 1 discovery search handoffs", () => {
  it("home article uses header-only search entry without inline /search handoff", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(<HomeArticle messages={messages} />);
    expectHomeArticleHeaderOnlySearchEntry(html);
  });

  it("primary navigation omits duplicate Search link while header search remains", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages);
    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/docs/architecture",
      "/docs/glossary",
      "/tags",
    ]);
    expect(items.some((item) => item.href === "/search")).toBe(false);
  });

  it("attention tag landing links to /search?tag=attention and exposes dialog handoff", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('href="/search?tag=attention"');
    expect(html).toContain("data-search");
  });

  it("attention prefill query surfaces grouped-query attention in search API results", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });
});
