import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderTagLandingPage } from "@/app/(site)/site-renderers";
import { HomeArticle } from "@/components/home/home-article";
import { getPrimaryNavItems } from "@/components/layout/primary-nav";
import {
  encodeSearchPageHandoffKey,
  resolveInitialSearchPageQuery,
  resolveSearchPageHandoff,
} from "@/features/docs/search/search-page-query";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
import { modelAtlasSiteConfig } from "@/lib/site/model-atlas-site-config";
import { expectHomeArticleHeaderOnlySearchEntry } from "@/tests/discovery/home-search-entry-contract";
import { resultsIncludeSampleModule } from "@/tests/search/helpers";

const SEARCH_HANDOFF_DISCOVERY_TIMEOUT_MS = 15_000;

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

  it("seeds classification when q and tag are absent", () => {
    expect(resolveInitialSearchPageQuery(null, null, "activation")).toBe(
      "activation",
    );
  });

  it("encodes handoff keys for client dedupe", () => {
    expect(
      encodeSearchPageHandoffKey({
        q: "GQA",
        tag: "attention",
        classification: "activation",
      }),
    ).toBe("GQA\0attention\0activation");
    expect(
      encodeSearchPageHandoffKey({
        q: null,
        tag: null,
        classification: null,
      }),
    ).toBe("\0\0");
  });
});

describe("search page server handoff", () => {
  it("resolves q and tag from request search params", () => {
    expect(
      resolveSearchPageHandoff({
        q: "GQA",
        tag: "attention",
        classification: "activation",
      }),
    ).toEqual({
      q: "GQA",
      tag: "attention",
      classification: "activation",
    });
  });

  it("trims whitespace and ignores empty values", () => {
    expect(
      resolveSearchPageHandoff({
        q: "  ",
        tag: " attention ",
        classification: " classification.activation-functions ",
      }),
    ).toEqual({
      q: null,
      tag: "attention",
      classification: "classification.activation-functions",
    });
  });

  it("reads the first value when Next passes repeated params", () => {
    expect(
      resolveSearchPageHandoff({
        tag: ["attention", "gqa"],
        classification: ["activation", "feed-forward"],
      }),
    ).toEqual({
      q: null,
      tag: "attention",
      classification: "activation",
    });
  });
});

describe("Phase 1 discovery search handoffs", () => {
  it("home article uses header-only search entry without inline /search handoff", async () => {
    const messages = await loadUiMessages();
    const html = renderToStaticMarkup(
      <HomeArticle messages={messages} siteConfig={modelAtlasSiteConfig} />,
    );
    expectHomeArticleHeaderOnlySearchEntry(html);
  });

  it("primary navigation omits duplicate Search link while header search remains", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages);
    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/topology",
      "/docs/timeline",
      "/blog",
      "/tags",
    ]);
    expect(items.some((item) => item.href === "/search")).toBe(false);
  });

  it(
    "attention tag landing links to /search?tag=attention and exposes dialog handoff",
    async () => {
      const page = await renderTagLandingPage({
        params: Promise.resolve({ slug: "attention" }),
      });
      const html = renderToStaticMarkup(page);
      expect(html).toContain('href="/search?tag=attention"');
      expect(html).toContain("data-search");
    },
    { timeout: SEARCH_HANDOFF_DISCOVERY_TIMEOUT_MS },
  );

  it(
    "attention tag landing preserves the locale in vietnamese search handoffs",
    async () => {
      const page = await renderTagLandingPage(
        {
          params: Promise.resolve({ slug: "attention" }),
        },
        "vi",
      );
      const html = renderToStaticMarkup(page);
      expect(html).toContain('href="/vi/search?tag=attention"');
      expect(html).toContain("data-search");
    },
    { timeout: SEARCH_HANDOFF_DISCOVERY_TIMEOUT_MS },
  );

  it(
    "attention tag landing preserves the locale in japanese search handoffs",
    async () => {
      const page = await renderTagLandingPage(
        {
          params: Promise.resolve({ slug: "attention" }),
        },
        "ja",
      );
      const html = renderToStaticMarkup(page);
      expect(html).toContain('href="/ja/search?tag=attention"');
      expect(html).toContain("data-search");
    },
    { timeout: SEARCH_HANDOFF_DISCOVERY_TIMEOUT_MS },
  );

  it(
    "attention prefill query surfaces grouped-query attention in search API results",
    async () => {
      const results = await docsSearchApi.search("attention");
      expect(results.length).toBeGreaterThan(0);
      expect(resultsIncludeSampleModule(results)).toBe(true);
    },
    { timeout: SEARCH_HANDOFF_DISCOVERY_TIMEOUT_MS },
  );
});
