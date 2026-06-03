import { describe, expect, test } from "bun:test";
import ArchitectureIndexPage from "@/app/(site)/docs/architecture/page";
import GlossaryIndexPage from "@/app/(site)/docs/glossary/page";
import HomePage from "@/app/(site)/page";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import TagsIndexPage from "@/app/(site)/tags/page";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  SAMPLE_MODULE_URL,
  resultsIncludeSampleModule,
} from "@/tests/search/helpers";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const PHASE_1_DISCOVERY_ROUTES = [
  {
    path: "/",
    render: () => <HomePage />,
    expectInHtml: "Model Atlas",
  },
  {
    path: "/docs/architecture",
    render: () => <ArchitectureIndexPage />,
    expectInHtml: "Architecture",
  },
  {
    path: "/docs/glossary",
    render: () => <GlossaryIndexPage />,
    expectInHtml: "Glossary",
  },
  {
    path: "/tags",
    render: () => <TagsIndexPage />,
    expectInHtml: "Tags",
  },
] as const;

function expectRouteRendersOk(
  element: ReactElement,
  expectedSubstring: string,
): void {
  const html = renderToStaticMarkup(element);
  expect(html.length).toBeGreaterThan(0);
  expect(html).toContain(expectedSubstring);
}

describe("Phase 1 search discovery", () => {
  test("GQA query ranks grouped-query attention first", async () => {
    const results = await docsSearchApi.search("GQA");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SAMPLE_MODULE_URL);
  });

  test.each(["KV cache", "kv cache", "kv-cache"] as const)(
    "%s query ranks grouped-query attention first",
    async (query) => {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.url).toBe(SAMPLE_MODULE_URL);
    },
  );

  test("attention query includes grouped-query attention among top results", async () => {
    const results = await docsSearchApi.search("attention");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeSampleModule(results)).toBe(true);
  });
});

describe("Phase 1 discovery route smoke", () => {
  for (const route of PHASE_1_DISCOVERY_ROUTES) {
    test(`${route.path} renders without error`, () => {
      expectRouteRendersOk(route.render(), route.expectInHtml);
    });
  }

  test("/tags/attention renders without error", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    expectRouteRendersOk(page, "Attention");
  });
});
