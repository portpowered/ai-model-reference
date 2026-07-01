import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import qwen3Messages from "@/content/docs/models/qwen3-0-6b/messages/en.json";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { modelPageHref } from "@/lib/content/content-hrefs";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
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

const MODEL_SLUG = "qwen3-0-6b";
const MODEL_ID = "model.qwen3-0-6b";
const MODEL_URL = modelPageHref(MODEL_SLUG);
const DENSE_QWEN36_URL = "/docs/models/qwen-3-6-27b";
const MOE_QWEN36_URL = "/docs/models/qwen-3-6-35b-a3b";
const repoRoot = join(import.meta.dir, "../../..");

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

describe("Qwen3-0.6B discovery paths", () => {
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
        "Qwen3-0.6B",
        "Qwen 3 0.6B",
        "Qwen3 small dense model",
        "small Qwen model",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining([
        "foundations",
        "model-family",
        "context-window",
        "attention",
        "tokenization",
      ]),
    );
    expect(document?.bodyText.length).toBeGreaterThan(200);
  });

  test.each([
    "Qwen3-0.6B",
    "Qwen 3 0.6B",
    "Qwen3 small dense model",
    "small Qwen model",
  ] as const)("search query %s resolves to the canonical model page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);
  });

  test("registry related metadata connects to Qwen 3.6, decoder-only, tokenization, context, and inference paths", () => {
    const model = getModelById(MODEL_ID);

    expect(model?.relatedIds).toEqual(
      expect.arrayContaining([
        "model.qwen-3-6-27b",
        "model.qwen-3-6-35b-a3b",
        "concept.transformer-architecture",
        "concept.context-window",
        "concept.tokenizers-overview",
        "system.inference-engine",
      ]),
    );
  });

  test("curated related items resolve to Qwen family and prerequisite discovery targets", () => {
    const source = getRegistryRecordById(MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected Qwen3-0.6B model in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "model.qwen-3-6-27b")?.href,
    ).toBe(DENSE_QWEN36_URL);
    expect(
      items.find((item) => item.registryId === "model.qwen-3-6-35b-a3b")?.href,
    ).toBe(MOE_QWEN36_URL);
    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "concept.context-window")?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      items.find((item) => item.registryId === "concept.tokenizers-overview")
        ?.href,
    ).toBe("/docs/concepts/tokenizers-overview");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
    expect(
      items.find((item) => item.registryId === "module.grouped-query-attention")
        ?.href,
    ).toBe("/docs/modules/grouped-query-attention");
  });

  test("RelatedDocs and DerivedRelatedDocs surface Qwen family and prerequisite discovery links", () => {
    const curatedHtml = renderToStaticMarkup(
      createElement(RelatedDocs, { registryId: MODEL_ID }),
    );
    const derivedHtml = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: MODEL_ID,
        groups: ["same-model-family", "curated-related"],
      }),
    );

    expect(curatedHtml).toContain('data-testid="curated-related-docs"');
    expect(curatedHtml).toContain(`href="${DENSE_QWEN36_URL}"`);
    expect(curatedHtml).toContain(`href="${MOE_QWEN36_URL}"`);
    expect(curatedHtml).toContain(
      'href="/docs/concepts/transformer-architecture"',
    );
    expect(curatedHtml).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(curatedHtml).toContain('href="/docs/glossary/context-window"');
    expect(curatedHtml).toContain('href="/docs/systems/inference-engine"');
    expect(derivedHtml).toContain(`href="${DENSE_QWEN36_URL}"`);
    expect(derivedHtml).toContain(`href="${MOE_QWEN36_URL}"`);
    expect(derivedHtml).toContain('data-related-group="curated-related"');
  });

  test("practical notes give concise next-step guidance through related discovery paths", () => {
    const practicalNotes =
      qwen3Messages.sections.practicalNotes.body.toLowerCase();

    expect(practicalNotes).toContain("related docs");
    expect(practicalNotes).toContain("decoder-only");
    expect(practicalNotes).toContain("tokenization");
    expect(practicalNotes).toContain("context-window");
    expect(practicalNotes).toContain("inference-engine");
    expect(practicalNotes).toContain("qwen 3.6");
  });

  test.each([
    "model-family",
    "context-window",
    "attention",
    "tokenization",
  ] as const)("tag browsing lists Qwen3-0.6B under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("model-family tag landing renders Qwen3-0.6B without empty-state placeholders", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "model-family" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(`href="${MODEL_URL}"`);
    expect(html).not.toContain("No resources");
    expect(html).not.toContain("Nothing has shipped");
  });

  test("rendered model page surfaces related docs, tags, and references for discovery handoffs", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain(`href="${DENSE_QWEN36_URL}"`);
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
  });

  test("served model page renders discovery surfaces without errors", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    const browser = await launchPlaywrightBrowser();

    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 800 },
      });
      page.setDefaultTimeout(30_000);
      await page.goto(`${session.baseUrl}${MODEL_URL}`, {
        waitUntil: "load",
      });

      await page
        .getByRole("heading", { name: "Qwen3-0.6B", exact: true })
        .waitFor({ state: "visible" });

      await page
        .locator('[data-testid="derived-related-docs"]')
        .first()
        .waitFor({ state: "visible" });
      await page
        .locator('[data-testid="curated-related-docs"]')
        .first()
        .waitFor({ state: "visible" });
      await page
        .locator('[data-testid="tag-pill-list"]')
        .first()
        .waitFor({ state: "visible" });

      const bodyText = await page.locator("article").innerText();
      expect(bodyText).toContain("Qwen3.6-27B");
      expect(bodyText).toContain("related docs");
      expect(bodyText).not.toContain("missing message");
      expect(bodyText).not.toContain("missing asset");

      await page.close();
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
