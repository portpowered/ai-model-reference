import { describe, expect, test } from "bun:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
import HomePage from "@/app/(site)/page";
import SearchEntryPage from "@/app/(site)/search/page";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import TagsIndexPage from "@/app/(site)/tags/page";
import TokenGlossaryPage from "@/app/docs/glossary/token/page";
import GroupedQueryAttentionPage from "@/app/docs/modules/grouped-query-attention/page";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  resultsIncludeSampleModule,
  SAMPLE_MODULE_URL,
} from "@/tests/search/helpers";

const PHASE_1_DISCOVERY_ROUTES = [
  {
    path: "/",
    render: () => Promise.resolve(<HomePage />),
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

  test("attention query includes grouped-query attention among top results", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
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

  test("/docs/glossary/token renders without error", async () => {
    const page = await TokenGlossaryPage();
    const html = renderToStaticMarkup(page);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Token");
    expect(html).not.toContain("lorem");
  });

  test("/docs/modules/grouped-query-attention renders without error", async () => {
    const page = await GroupedQueryAttentionPage();
    const html = renderToStaticMarkup(page);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Grouped-Query Attention");
    expect(html).toContain('href="/tags/attention"');
    expect(html).not.toContain("lorem");
  });
});

describe("Phase 1 tag browse helpers", () => {
  test("attention tag includes grouped-query attention under modules", async () => {
    const messages = loadUiMessages();
    const groups = await loadTagResourceGroups("attention", messages, "en");
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup).toBeDefined();
    expect(
      moduleGroup?.resources.some(
        (resource) => resource.url === "/docs/modules/grouped-query-attention",
      ),
    ).toBe(true);
  });
});
