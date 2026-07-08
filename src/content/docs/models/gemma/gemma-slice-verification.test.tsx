/**
 * Consolidated review-facing slice proof for the Gemma model-family page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data` and story-scoped identity/registry/reader/
 * architecture tests; this file proves observable route, rendering, search,
 * citation, and discovery behavior together.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { getModelsDocsRoot } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModelPage } from "@/lib/content/model-page";
import { getPublishedDocsEntryByRegistryId } from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const MODEL_SLUG = "gemma";
const MODEL_ID = "model.gemma";
const MODEL_URL = "/docs/models/gemma";
const GRAPH_ID = "graph.gemma-architecture";
const repoRoot = join(import.meta.dir, "../../../../..");

const PRIMARY_SOURCE_CITATION_URLS = [
  "https://arxiv.org/abs/2607.02770",
  "https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/",
  "https://ai.google.dev/gemma/docs/core/model_card_4",
  "https://ai.google.dev/gemma/docs/core",
  "https://ai.google.dev/gemma/docs/get_started",
] as const;

const SEARCH_QUERIES = [
  "Gemma",
  "Gemma 4",
  "Google Gemma",
  "open model",
  "multimodal open model",
  "on-device model",
] as const;

const pageDir = join(getModelsDocsRoot(), MODEL_SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

async function renderModelPageHtml(): Promise<string> {
  const page = await loadModelPage(MODEL_SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("Gemma slice verification (gemma-model-family-page-current-main-006)", () => {
  test("canonical route resolves to a published model page with registry record, English messages, local assets, and graph wiring", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const entry = getPublishedDocsEntryByRegistryId(MODEL_ID);
    const model = getModelById(MODEL_ID);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(entry).toMatchObject({
      registryId: MODEL_ID,
      slug: MODEL_SLUG,
      url: MODEL_URL,
    });
    expect(model?.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(MODEL_ID);
    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.title).toBe("Gemma");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      altKey: "assets.architectureGraph.alt",
    });
    expect(JSON.parse(readFileSync(assetsPath, "utf8"))).toMatchObject({
      architectureGraph: {
        graphId: GRAPH_ID,
      },
    });
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata(["models", MODEL_SLUG]);
    expect(metadata.alternates).toEqual({
      canonical: MODEL_URL,
      languages: {
        en: MODEL_URL,
      },
    });
    expect(metadata.title).toContain("Gemma");

    const rendered = await renderDocsSlugPage(["models", MODEL_SLUG], "en");
    expect(rendered).toBeDefined();
  });

  test("primary-source citations resolve and render in the references section", async () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected model.gemma in registry");
    }

    const citations = resolveCitations(model.citationIds);
    const urls = citations.map((citation) => citation.url);
    for (const primaryUrl of PRIMARY_SOURCE_CITATION_URLS) {
      expect(urls).toContain(primaryUrl);
    }
    expect(new Set(urls).size).toBe(urls.length);

    const html = await renderModelPageHtml();
    expect(html).toContain('data-testid="citation-list"');
    for (const url of PRIMARY_SOURCE_CITATION_URLS) {
      expect(html).toContain(`href="${url}"`);
    }
  });

  test("rendered page exposes title, opening summary, metadata, tags, related docs, architecture graph, and references", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const graph = getGraphById(GRAPH_ID);
    const html = await renderModelPageHtml();

    expect(graph?.subjectId).toBe(MODEL_ID);
    expect(html).toContain("Gemma");
    expect(html).toContain("Google DeepMind");
    expect(html).toContain("Gemma 4");
    expect(html).toContain('data-registry-id="model.gemma"');
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="curated-related"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/modules/mixture-of-experts"');
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain(page.messages.assets?.architectureGraph?.alt ?? "");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain("Draft placeholder");
  });

  test("representative search queries surface the canonical Gemma page", async () => {
    for (const query of SEARCH_QUERIES) {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
    }
  });

  test("related-doc traversal exposes transformer, multimodal, MoE, and serving discovery paths", () => {
    const relatedHtml = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: MODEL_ID,
        groups: ["curated-related"],
      }),
    );

    expect(relatedHtml).toContain('data-related-group="curated-related"');
    expect(relatedHtml).toContain(
      'href="/docs/concepts/transformer-architecture"',
    );
    expect(relatedHtml).toContain('href="/docs/glossary/multimodal-model"');
    expect(relatedHtml).toContain('href="/docs/modules/mixture-of-experts"');
    expect(relatedHtml).toContain('href="/docs/systems/inference-engine"');
    expect(relatedHtml).toContain('href="/docs/systems/deployment"');
  });

  test("served Gemma page renders title, sections, graph, tags, and references without errors", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    const browser = await launchPlaywrightBrowser();

    try {
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 375, height: 667 },
      ]) {
        const page = await browser.newPage({ viewport });
        page.setDefaultTimeout(30_000);
        await page.goto(`${session.baseUrl}${MODEL_URL}`, {
          waitUntil: "load",
        });

        await page
          .getByRole("heading", { name: "Gemma", exact: true })
          .waitFor({ state: "visible" });

        for (const sectionTitle of [
          "What It Is",
          "Architecture",
          "Practical Notes",
          "References",
        ]) {
          await page
            .getByRole("heading", { name: sectionTitle })
            .first()
            .waitFor({ state: "visible" });
        }

        const graph = page.locator('[data-react-flow-graph="true"]');
        await graph.waitFor({ state: "visible" });
        expect(await graph.getAttribute("data-graph-id")).toBe(GRAPH_ID);

        await page
          .locator('[data-testid="tag-pill-list"]')
          .first()
          .waitFor({ state: "visible" });

        await page
          .locator('[data-testid="citation-list"]')
          .first()
          .waitFor({ state: "visible" });

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
