/**
 * BERT model discovery slice proof for search, tag landing, and related-doc
 * navigation. Routine bundle/registry alignment is covered by `make validate-data`;
 * this file proves observable routing through aliases, tags, and registry metadata.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
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

const MODEL_SLUG = "bert";
const MODEL_ID = "model.bert";
const MODEL_URL = modelPageHref(MODEL_SLUG);
const BERT_PAPER_URL =
  "/docs/papers/bert-pre-training-of-deep-bidirectional-transformers";
const repoRoot = join(import.meta.dir, "../../..");

const BERT_DISCOVERY_QUERIES = [
  { query: "BERT", expectFirst: true },
  {
    query: "Bidirectional Encoder Representations from Transformers",
    expectFirst: true,
  },
  { query: "encoder-only transformer", expectFirst: false },
  { query: "bidirectional transformer encoder", expectFirst: true },
] as const;

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

describe("BERT model discovery surfaces", () => {
  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const document = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === MODEL_URL,
    );

    expect(document).toBeDefined();
    expect(document?.kind).toBe("model");
    expect(document?.registryId).toBe(MODEL_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "BERT",
        "bert",
        "Bidirectional Encoder Representations from Transformers",
        "encoder-only transformer",
        "bidirectional transformer encoder",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining([
        "foundations",
        "model-family",
        "attention",
        "tokenization",
      ]),
    );
    expect(document?.bodyText).toContain("masked language modeling");
    expect(document?.bodyText).toContain("bidirectional self-attention");
  });

  for (const { query, expectFirst } of BERT_DISCOVERY_QUERIES) {
    test(`search query ${query} returns the canonical BERT model page`, async () => {
      const results = await docsSearchApi.search(query);

      expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);

      if (expectFirst) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);
      }
    });
  }

  test("registry related metadata connects to transformer, attention, WordPiece, and pretraining paths", () => {
    const model = getModelById(MODEL_ID);

    expect(model?.relatedIds).toEqual(
      expect.arrayContaining([
        "paper.bert-pre-training-of-deep-bidirectional-transformers",
        "concept.transformer-architecture",
        "concept.self-attention",
        "concept.tokenizers-overview",
        "module.wordpiece",
        "module.bidirectional-attention",
        "training-regime.pretraining",
      ]),
    );
  });

  test("curated related items resolve paper, concept, module, and training discovery targets", () => {
    const source = getRegistryRecordById(MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected model.bert in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) =>
          item.registryId ===
          "paper.bert-pre-training-of-deep-bidirectional-transformers",
      )?.href,
    ).toBe(BERT_PAPER_URL);
    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "concept.self-attention")?.href,
    ).toBe("/docs/concepts/self-attention");
    expect(
      items.find((item) => item.registryId === "module.wordpiece")?.href,
    ).toBe("/docs/modules/wordpiece");
    expect(
      items.find((item) => item.registryId === "training-regime.pretraining")
        ?.href,
    ).toBe("/docs/training/pretraining");
  });

  test("RelatedDocs and DerivedRelatedDocs surface curated and registry-backed discovery links", () => {
    const curatedHtml = renderToStaticMarkup(
      createElement(RelatedDocs, { registryId: MODEL_ID }),
    );
    const derivedHtml = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: MODEL_ID,
        groups: [
          "shared-modules",
          "shared-training-regimes",
          "curated-related",
        ],
      }),
    );

    expect(curatedHtml).toContain('data-testid="curated-related-docs"');
    expect(curatedHtml).toContain(`href="${BERT_PAPER_URL}"`);
    expect(curatedHtml).toContain(
      'href="/docs/concepts/transformer-architecture"',
    );
    expect(curatedHtml).toContain('href="/docs/modules/wordpiece"');
    expect(derivedHtml).toContain(
      'href="/docs/modules/bidirectional-attention"',
    );
    expect(derivedHtml).toContain('href="/docs/training/pretraining"');
  });

  test.each([
    "model-family",
    "attention",
    "tokenization",
  ] as const)("tag browsing lists BERT under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("model-family tag landing renders BERT without empty-state placeholders", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "model-family" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(`href="${MODEL_URL}"`);
    expect(html).not.toContain("No resources");
    expect(html).not.toContain("Nothing has shipped");
  });

  test("rendered model page surfaces related docs, tags, references, and architecture graph for discovery handoffs", async () => {
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
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain('data-graph-id="graph.bert-architecture"');
    expect(html).toContain(`href="${BERT_PAPER_URL}"`);
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
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
        .getByRole("heading", { name: "BERT", exact: true })
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
        .locator('[data-page-asset="architectureGraph"]')
        .first()
        .waitFor({ state: "visible" });

      const bodyText = await page.locator("article").innerText();
      expect(bodyText).toContain(
        "Bidirectional Encoder Representations from Transformers",
      );
      expect(bodyText).toContain("WordPiece");
      expect(bodyText).toContain("masked language modeling");
      expect(bodyText).not.toContain("missing message");
      expect(bodyText).not.toContain("missing asset");

      await page.close();
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
