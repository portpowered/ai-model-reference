import { describe, expect, test } from "bun:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
import SearchEntryPage from "@/app/(site)/search/page";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import TagsIndexPage from "@/app/(site)/tags/page";
import { HomeArticle } from "@/components/home/home-article";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  assertCanonicalPageLevelApiResults,
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_VECTOR_GLOSSARY_URL,
} from "@/lib/verify/phase-1-search-checks";
import { expectHomeArticleHeaderOnlySearchEntry } from "@/tests/discovery/home-search-entry-contract";
import {
  resultsIncludeSampleModule,
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
    render: () => SearchEntryPage(),
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
  ] as const)("%s query ranks grouped-query attention first", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_MODULE_URL);
  });

  test("attention query returns canonical attention module and grouped-query attention hits without duplicate pages", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(assertCanonicalPageLevelApiResults(results)).toBeNull();
    expect(resultsIncludeUrl(results, PHASE_1_ATTENTION_MODULE_URL)).toBe(true);
    expect(resultsIncludeSampleModule(results)).toBe(true);
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

  test("/docs/glossary/token loads published local docs content", async () => {
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });

    expect(page.messages.title).toBe("Token");
    expect(page.frontmatter.registryId).toBe("concept.token");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
  });

  test("/docs/modules/attention loads published local docs content", async () => {
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: "attention",
    });

    expect(page.messages.title).toBe("Attention");
    expect(page.frontmatter.registryId).toBe("module.attention");
    expect(page.messages.callouts?.phase1Bridge?.body).toContain("Phase 3");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
  });

  test("/docs/glossary/vector loads published local docs content", async () => {
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "vector",
    });

    expect(page.messages.title).toBe("Vector");
    expect(page.frontmatter.registryId).toBe("concept.vector");
    expect(page.messages.callouts?.phase1Bridge?.body).toContain("Phase 2");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
  });

  test("/docs/glossary/hidden-size loads published local docs content", async () => {
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "hidden-size",
    });

    expect(page.messages.title).toBe("Hidden Size");
    expect(page.frontmatter.registryId).toBe("concept.hidden-size");
    expect(page.messages.callouts?.phase1Bridge?.body).toContain("Phase 2");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
  });

  test("/docs/modules/grouped-query-attention loads published local docs content", async () => {
    const page = await loadLocalDocsPage({
      section: "modules",
      slug: "grouped-query-attention",
    });

    expect(page.messages.title).toBe("Grouped-Query Attention");
    expect(page.frontmatter.registryId).toBe("module.grouped-query-attention");
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
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
