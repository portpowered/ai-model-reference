/**
 * Consolidated review-facing slice proof for the Whisper model page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, citation, architecture graph, search, link, and discovery behavior.
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
import {
  getContentRoot,
  getDocsPageDir,
  getModelsDocsRoot,
  getRegistryRoot,
} from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { validateGeneratedPageBundle } from "@/lib/content/validate-generated-page-bundle";
import { buildSearchDocuments } from "@/lib/search/build-documents";
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
import { resultsIncludeUrl } from "@/tests/search/helpers";

const MODEL_SLUG = "whisper";
const MODEL_ID = "model.whisper";
const MODEL_URL = "/docs/models/whisper";
const GRAPH_ID = "graph.whisper-architecture";
const pageDir = getDocsPageDir("models", MODEL_SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const repoRoot = join(import.meta.dir, "../../..");

const PRIMARY_SOURCE_CITATION_URLS = [
  "https://arxiv.org/abs/2212.04356",
  "https://github.com/openai/whisper",
  "https://huggingface.co/openai/whisper-large-v3",
] as const;

const WHISPER_DISCOVERY_QUERIES = [
  { query: "Whisper", expectFirst: true },
  { query: "OpenAI Whisper", expectFirst: true },
  { query: "speech recognition", expectFirst: false },
  { query: "automatic speech recognition", expectFirst: false },
  { query: "speech translation", expectFirst: false },
] as const;

const RELATED_DOC_HREFS = [
  "/docs/glossary/encoder-decoder",
  "/docs/concepts/tokenizers-overview",
  "/docs/glossary/multimodal-model",
  "/docs/modules/cross-attention",
  "/docs/modules/bpe",
] as const;

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

describe("Whisper model slice verification (whisper-model-page-current-main-006)", () => {
  test("registry and page bundle validation resolves messages, tags, citations, related IDs, and assets together", async () => {
    const registryRoot = getRegistryRoot();
    const pageDirectory = join(getModelsDocsRoot(), MODEL_SLUG);
    const indexes = await loadRegistry({ registryRoot });

    const errors = await validateGeneratedPageBundle({
      registryRoot,
      docsRoot: join(getContentRoot(), "docs"),
      pageDirectory,
      registryPath: join(registryRoot, "models", `${MODEL_SLUG}.json`),
      pageUrl: MODEL_URL,
      indexes,
    });

    expect(errors).toEqual([]);

    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));
    const page = await loadModelPage(MODEL_SLUG);
    const model = getModelById(MODEL_ID);

    expect(model?.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(MODEL_ID);
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledAssets.architectureGraph?.graphId).toBe(GRAPH_ID);
    expect(page.assets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      altKey: "assets.architectureGraph.alt",
    });
    expect(model?.citationIds).toHaveLength(3);
    expect(model?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.encoder-decoder",
        "concept.tokenizers-overview",
        "concept.multimodal-model",
        "module.cross-attention",
        "module.bpe",
      ]),
    );
  });

  test("published docs registry resolves the canonical whisper route", () => {
    expect(PUBLISHED_DOCS_REGISTRY_IDS).toContain(MODEL_ID);

    const entry = getPublishedDocsEntryByRegistryId(MODEL_ID);
    expect(entry).toMatchObject({
      registryId: MODEL_ID,
      slug: MODEL_SLUG,
      url: MODEL_URL,
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
    expect(metadata.title).toContain("Whisper");

    const rendered = await renderDocsSlugPage(["models", MODEL_SLUG], "en");
    expect(rendered).toBeDefined();
  });

  test("primary-source citations resolve and render in the references section", async () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected model.whisper in registry");
    }

    const citations = resolveCitations(model.citationIds);
    expect(citations.map((citation) => citation.url)).toEqual([
      ...PRIMARY_SOURCE_CITATION_URLS,
    ]);
    expect(citations.every((citation) => citation.mla.length > 0)).toBe(true);
    expect(new Set(citations.map((citation) => citation.url)).size).toBe(
      PRIMARY_SOURCE_CITATION_URLS.length,
    );

    const html = await renderModelPageHtml();
    expect(html).toContain('data-testid="citation-list"');
    for (const url of PRIMARY_SOURCE_CITATION_URLS) {
      expect(html).toContain(`href="${url}"`);
    }
  });

  test("curated related docs and prose auto-links resolve to published internal targets", async () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected model.whisper in registry");
    }

    const items = deriveCuratedRelatedItems(
      model,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const href of RELATED_DOC_HREFS) {
      expect(items.some((item) => item.href === href && !item.isPlanned)).toBe(
        true,
      );
    }

    const relatedHtml = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: MODEL_ID,
        groups: ["curated-related"],
      }),
    );
    for (const href of RELATED_DOC_HREFS) {
      expect(relatedHtml).toContain(`href="${href}"`);
    }

    const html = await renderModelPageHtml();
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/modules/cross-attention"');
    expect(html).toContain('href="/docs/modules/bpe"');
  });

  test("rendered page exposes title, sections, graph, tags, related docs, and references without placeholders", async () => {
    const graph = getGraphById(GRAPH_ID);
    const page = await loadModelPage(MODEL_SLUG);
    const html = await renderModelPageHtml();

    expect(graph?.subjectId).toBe(MODEL_ID);
    expect(html).toContain("Whisper");
    expect(html).toContain("OpenAI");
    expect(html).toContain("automatic speech recognition");
    expect(html).toContain("speech translation");
    expect(html).toContain("What It Is");
    expect(html).toContain("Inputs And Outputs");
    expect(html).toContain("Architecture");
    expect(html).toContain("Important Modules");
    expect(html).toContain("Training");
    expect(html).toContain("Practical Notes");
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain(page.messages.assets?.architectureGraph?.alt ?? "");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("missing-content");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("No modules listed yet.");
  });

  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === MODEL_URL);

    expect(document).toBeDefined();
    expect(document?.kind).toBe("model");
    expect(document?.registryId).toBe(MODEL_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Whisper",
        "OpenAI Whisper",
        "speech recognition",
        "automatic speech recognition",
        "speech translation",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "model-family", "tokenization"]),
    );
    expect(document?.relatedIds).toContain("concept.encoder-decoder");
    expect(document?.relatedIds).toContain("concept.multimodal-model");
    expect(document?.bodyText.length).toBeGreaterThan(200);
  });

  for (const { query, expectFirst } of WHISPER_DISCOVERY_QUERIES) {
    test(`search query ${query} returns the canonical Whisper model page`, async () => {
      const results = await docsSearchApi.search(query);

      expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);

      if (expectFirst) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);
      }
    });
  }

  test.each([
    "model-family",
    "tokenization",
  ] as const)("tag browsing lists Whisper under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("served Whisper page renders title, sections, graph, tags, and references without errors", async () => {
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
          .getByRole("heading", { name: "Whisper", exact: true })
          .waitFor({ state: "visible" });

        for (const sectionTitle of [
          "What It Is",
          "Inputs And Outputs",
          "Architecture",
          "Important Modules",
          "Training",
          "Practical Notes",
          "Related Models, Modules, And Papers",
          "Tags",
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
        await page
          .locator('[data-testid="derived-related-docs"]')
          .first()
          .waitFor({ state: "visible" });

        const bodyText = await page.locator("article").innerText();
        expect(bodyText).not.toContain("Draft placeholder");
        expect(bodyText).not.toContain("missing message");
        expect(bodyText).not.toContain("missing asset");

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
