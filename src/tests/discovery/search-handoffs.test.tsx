import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTagLandingPage } from "@/app/(site)/tags/[slug]/page";
import { HomeArticle } from "@/components/home/home-article";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import {
  encodeSearchPageHandoffKey,
  resolveInitialSearchPageQuery,
  resolveSearchPageHandoff,
} from "@/features/docs/search/search-page-query";
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

  it("encodes handoff keys for client dedupe", () => {
    expect(encodeSearchPageHandoffKey({ q: "GQA", tag: "attention" })).toBe(
      "GQA\0attention",
    );
    expect(encodeSearchPageHandoffKey({ q: null, tag: null })).toBe("\0");
  });
});

describe("search page server handoff", () => {
  it("resolves q and tag from request search params", () => {
    expect(resolveSearchPageHandoff({ q: "GQA", tag: "attention" })).toEqual({
      q: "GQA",
      tag: "attention",
    });
  });

  it("trims whitespace and ignores empty values", () => {
    expect(resolveSearchPageHandoff({ q: "  ", tag: " attention " })).toEqual({
      q: null,
      tag: "attention",
    });
  });

  it("reads the first value when Next passes repeated params", () => {
    expect(resolveSearchPageHandoff({ tag: ["attention", "gqa"] })).toEqual({
      q: null,
      tag: "attention",
    });
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
    const page = await renderTagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('href="/search?tag=attention"');
    expect(html).toContain("data-search");
  });

  it("attention tag landing preserves locale in search handoff links on /vi", async () => {
    const page = await renderTagLandingPage(
      {
        params: Promise.resolve({ slug: "attention" }),
      },
      "vi",
    );
    const html = renderToStaticMarkup(page);
    expect(html).toContain('href="/vi/search?tag=attention"');
  });

  it("attention prefill query surfaces grouped-query attention in search API results", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });
});
