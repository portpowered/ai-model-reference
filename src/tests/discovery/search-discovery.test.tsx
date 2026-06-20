import "@/tests/a11y/mock-navigation";
import { describe, expect, test } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
import SearchEntryPage from "@/app/(site)/search/page";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import TagsIndexPage from "@/app/(site)/tags/page";
import { HomeArticle } from "@/components/home/home-article";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  loadCriticalDocsSmokePages,
  toCriticalDocsSmokeLocalRef,
} from "@/lib/content/critical-docs-smoke";
import {
  loadLocalDocsPage,
  localDocsRoute,
} from "@/lib/content/local-docs-page";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
import { assertSearchPageBuiltAppShell } from "@/lib/verify/phase-1-search-built-app-shell-checks";
import {
  assertCanonicalPageLevelApiResults,
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_VECTOR_GLOSSARY_URL,
} from "@/lib/verify/phase-1-search-checks";
import { expectHomeArticleHeaderOnlySearchEntry } from "@/tests/discovery/home-search-entry-contract";
import {
  resultsIncludeMultiQueryAttention,
  resultsIncludeSampleModule,
  resultsIncludeTokenizersOverview,
  resultsIncludeUrl,
  SAMPLE_MODULE_URL,
} from "@/tests/search/helpers";

const PHASE_1_DISCOVERY_ROUTES = [
  {
    path: "/",
    render: async () => {
      const messages = await loadUiMessages();
      return <HomeArticle messages={messages} />;
    },
    expectInHtml: "Model Atlas",
  },
  {
    path: "/search",
    render: () => SearchEntryPage({}),
    expectInHtml: "Search",
  },
  {
    path: "/docs/architecture",
    render: () => ArchitectureIndexPage(),
    expectInHtml: "Architecture",
    alsoExpectInHtml: "Token",
  },
  {
    path: "/docs/glossary",
    render: () => GlossaryIndexPage(),
    expectInHtml: "Glossary",
    alsoExpectInHtml: "Token",
  },
  {
    path: "/tags",
    render: () => TagsIndexPage(),
    expectInHtml: "Tags",
    alsoExpectInHtml: "/tags/attention",
  },
] as const;

function expectRouteRendersOk(
  element: ReactElement,
  expectedSubstring: string,
  alsoExpected?: string,
): void {
  const html = renderToStaticMarkup(element);
  expect(html.length).toBeGreaterThan(0);
  expect(html).toContain(expectedSubstring);
  if (alsoExpected) {
    expect(html).toContain(alsoExpected);
  }
}

function renderLoadedPageHtml(
  page: Awaited<ReturnType<typeof loadLocalDocsPage>>,
) {
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: createElement children are passed through props in this test helper
      children: page.content,
    }),
  );
}

describe("Phase 1 search discovery", () => {
  test("GQA query ranks grouped-query attention first", async () => {
    const results = await docsSearchApi.search("GQA");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_MODULE_URL);
  });

  test.each([
    "KV cache",
    "kv cache",
    "kv-cache",
  ] as const)("%s query includes grouped-query attention and multi-query attention without duplicate pages", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeSampleModule(results)).toBe(true);
    expect(resultsIncludeMultiQueryAttention(results)).toBe(true);
  });

  test("attention query returns canonical attention module and grouped-query attention hits without duplicate pages", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeUrl(results, PHASE_1_ATTENTION_MODULE_URL)).toBe(true);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });

  test.each([
    "DPO",
    "Direct Preference Optimization",
    "preference optimization",
  ] as const)("%s query routes readers to the canonical DPO training page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeUrl(results, "/docs/training/dpo")).toBe(true);
  });

  test.each([
    "tokenizer",
    "tokenizers",
    "text tokenization",
  ] as const)("%s query returns tokenizers overview as a direct relevant hit", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(results[0]?.url).toBe("/docs/concepts/tokenizers-overview");
    expect(resultsIncludeTokenizersOverview(results)).toBe(true);
  });

  test("vector query returns canonical vector glossary hit without duplicate pages", async () => {
    const results = await docsSearchApi.search("vector");
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeUrl(results, PHASE_1_VECTOR_GLOSSARY_URL)).toBe(true);
  });

  test("hidden size query returns canonical hidden-size glossary hit without duplicate pages", async () => {
    const results = await docsSearchApi.search("hidden size");
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeUrl(results, PHASE_1_HIDDEN_SIZE_GLOSSARY_URL)).toBe(
      true,
    );
  });

  test.each([
    "vocabulary size",
    "vocab size",
    "tokenizer vocabulary",
  ] as const)("%s query returns canonical vocabulary-size glossary hit without duplicate pages", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeUrl(results, "/docs/glossary/vocabulary-size")).toBe(
      true,
    );
  });
});

describe("Phase 1 discovery route smoke", () => {
  for (const route of PHASE_1_DISCOVERY_ROUTES) {
    test(`${route.path} renders without error`, async () => {
      const page = await route.render();
      expectRouteRendersOk(
        page,
        route.expectInHtml,
        "alsoExpectInHtml" in route ? route.alsoExpectInHtml : undefined,
      );

      if (route.path === "/") {
        expectHomeArticleHeaderOnlySearchEntry(renderToStaticMarkup(page));
      }

      if (route.path === "/search") {
        expect(
          assertSearchPageBuiltAppShell(renderToStaticMarkup(page)),
        ).toBeNull();
      }
    });
  }

  test("/tags/attention renders without error", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Attention");
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/search?tag=attention"');
    expect(html).not.toContain("lorem");
  });

  test("critical canonical docs autodiscovery loads published local docs content", async () => {
    const pages = await loadCriticalDocsSmokePages();

    expect(pages.length).toBeGreaterThan(0);

    for (const discoveredPage of pages) {
      const localRef = toCriticalDocsSmokeLocalRef(discoveredPage);
      const page = await loadLocalDocsPage(localRef);

      expect(page.frontmatter.registryId).toBe(
        discoveredPage.frontmatter.registryId,
      );
      expect(page.messages.title).toBe(discoveredPage.messages.title);
      expect(page.toc.length).toBeGreaterThan(0);
      expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);

      if (discoveredPage.frontmatter.kind === "module") {
        expect(
          page.toc.some((item) => item.url === "#compared-to-nearby-modules"),
          discoveredPage.url,
        ).toBe(true);
      }
    }
  });

  test("/docs/glossary/token loads published local docs content with tokenizer overview handoff", async () => {
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });

    expect(page.messages.title).toBe("Token");
    expect(page.frontmatter.registryId).toBe("concept.token");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
    const html = renderLoadedPageHtml(page);
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
  });

  test("/docs/concepts/transformer-architecture loads published local docs content with tokenizer overview handoff", async () => {
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "transformer-architecture",
    });

    expect(page.messages.title).toBe("Transformer architecture");
    expect(page.frontmatter.registryId).toBe(
      "concept.transformer-architecture",
    );
    expect(page.toc.some((item) => item.url === "#related")).toBe(true);
    const html = renderLoadedPageHtml(page);
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
  });

  test("/docs/models/gpt-3 loads published local docs content with tokenizer overview handoff", async () => {
    const page = await loadLocalDocsPage({
      section: "models",
      slug: "gpt-3",
    });

    expect(page.messages.title).toBe("GPT-3");
    expect(page.frontmatter.registryId).toBe("model.gpt-3");
    expect(page.toc.some((item) => item.url === "#related")).toBe(true);
    const html = renderLoadedPageHtml(page);
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
  });

  test("critical canonical docs autodiscovery renders discovered docs content without bespoke inventories", async () => {
    const pages = await loadCriticalDocsSmokePages();

    expect(pages.length).toBeGreaterThan(0);

    for (const discoveredPage of pages) {
      const localRef = toCriticalDocsSmokeLocalRef(discoveredPage);
      const page = await loadLocalDocsPage(localRef);
      const html = renderToStaticMarkup(
        <ModulePageProviders messages={page.messages} assets={page.assets}>
          {page.content}
        </ModulePageProviders>,
      );

      expect(html.length, discoveredPage.url).toBeGreaterThan(0);
      expect(localDocsRoute(localRef)).toBe(discoveredPage.url);
      expect(html, discoveredPage.url).toContain('data-testid="tag-pill-list"');
      expect(html, discoveredPage.url).toContain('id="related"');
      expect(html, discoveredPage.url).not.toContain("Reader Shortcut");
      expect(html, discoveredPage.url).not.toContain("lorem");
    }
  });

  test("/docs/training/dpo loads published local docs content", async () => {
    const page = await loadLocalDocsPage({
      section: "training",
      slug: "dpo",
    });

    expect(page.messages.title).toBe("Direct Preference Optimization");
    expect(page.frontmatter.registryId).toBe("training-regime.dpo");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "direct preference optimization",
    );
    expect(page.messages.sections?.howItWorks.body).toContain(
      "preferred and one rejected",
    );
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(
      page.toc.some((item) => item.url === "#compared-to-nearby-regimes"),
    ).toBe(true);
  });
});

describe("Phase 1 tag browse helpers", () => {
  test("attention tag includes attention bridge and grouped-query attention under modules", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("attention", messages, "en");
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup).toBeDefined();
    expect(
      moduleGroup?.resources.some(
        (resource) => resource.url === PHASE_1_ATTENTION_MODULE_URL,
      ),
    ).toBe(true);
    expect(
      moduleGroup?.resources.some(
        (resource) => resource.url === "/docs/modules/grouped-query-attention",
      ),
    ).toBe(true);
  });
});
