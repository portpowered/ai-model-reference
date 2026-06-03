import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "@/app/(site)/page";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import { resolveInitialSearchPageQuery } from "@/features/docs/search/search-page-query";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
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
  it("home exposes dialog entry and documented /search bookmark link", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('href="/search"');
    expect(html).toContain("data-search");
  });

  it("primary navigation includes Search link to /search", async () => {
    const messages = await loadUiMessages();
    const searchNav = getPrimaryNavItems(messages).find(
      (item) => item.href === "/search",
    );
    expect(searchNav).toBeDefined();
    expect(searchNav?.label).toBe(messages.nav.search);
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
