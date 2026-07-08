/**
 * Consolidated review-facing slice proof for the BERT model page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, architecture graph, search, tag landing, and related-link behavior.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { resolveCitations } from "@/lib/content/citations";
import { modelPageHref } from "@/lib/content/content-hrefs";
import { getDocsPageDir } from "@/lib/content/content-paths";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import type { PageAssetConfig } from "@/lib/content/schemas";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const BERT_FULL_NAME =
  "Bidirectional Encoder Representations from Transformers";
const MODEL_SLUG = "bert";
const MODEL_ID = "model.bert";
const MODEL_URL = modelPageHref(MODEL_SLUG);
const GRAPH_ID = "graph.bert-architecture";
const BERT_PAPER_URL =
  "/docs/papers/bert-pre-training-of-deep-bidirectional-transformers";

const pageDir = getDocsPageDir("models", MODEL_SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

const bertMessages = pageMessagesSchema.parse(
  JSON.parse(readFileSync(messagesPath, "utf8")),
);

const bertAssets = parsePageAssetConfig(
  JSON.parse(readFileSync(assetsPath, "utf8")),
) satisfies PageAssetConfig;

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

function renderArchitectureGraph() {
  return render(
    <PageMessagesProvider messages={bertMessages} isDev={false}>
      <PageAssetsProvider assets={bertAssets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={bertMessages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("BERT model slice verification (bert-model-page-current-main-005)", () => {
  afterEach(() => {
    cleanup();
  });

  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const entry = getPublishedDocsEntryByRegistryId(MODEL_ID);
    const record = getModelById(MODEL_ID);
    const page = await loadLocalDocsPage({
      section: "models",
      slug: MODEL_SLUG,
    });

    expect(entry).toMatchObject({
      registryId: MODEL_ID,
      url: MODEL_URL,
      section: "models",
    });
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(MODEL_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe(MODEL_SLUG);
    expect(page.frontmatter.registryId).toBe(MODEL_ID);
    expect(page.frontmatter.kind).toBe("model");
    expect(page.messages.title).toBe(bertMessages.title);
    expect(page.messages.openingSummary).toBe(bertMessages.openingSummary);
    expect(validatePageAssetReferences(bertAssets, bertMessages)).toEqual([]);
    expect(bertAssets.architectureGraph).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
    });
  });

  test("messages expand the full BERT name and teach encoder-only behavior without benchmark framing", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const record = getModelById(MODEL_ID);
    const sections = page.messages.sections;

    expect(sections).toBeDefined();
    if (!sections) {
      return;
    }

    expect(record?.architectureIds).toEqual(
      expect.arrayContaining([
        "concept.transformer-architecture",
        "concept.encoder",
      ]),
    );
    expect(page.messages.openingSummary).toContain(`${BERT_FULL_NAME} (BERT)`);
    expect(sections.whatItIs.body).toContain(BERT_FULL_NAME);
    expect(sections.architecture.body).toContain("decoder-only models");
    expect(sections.architecture.body).toContain(
      "bidirectional self-attention",
    );
    expect(sections.inputsAndOutputs.body).toContain("WordPiece");
    expect(sections.inputsAndOutputs.body).toContain("position embedding");
    expect(sections.inputsAndOutputs.body).toContain("segment embedding");
    expect(sections.training.body).toContain("masked language modeling");
    expect(sections.practicalNotes.body).not.toContain("benchmark");
    expect(page.messages.relatedDocs).toMatchObject({
      "paper.bert-pre-training-of-deep-bidirectional-transformers": {
        reason: expect.any(String),
      },
      "concept.transformer-architecture": {
        reason: expect.any(String),
      },
      "concept.self-attention": {
        reason: expect.any(String),
      },
      "module.wordpiece": {
        reason: expect.any(String),
      },
      "training-regime.pretraining": {
        reason: expect.any(String),
      },
    });
  });

  test("architecture graph record and render surface teach encoder-only flow", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "wordpiece-tokens",
        "bidirectional-mha",
        "task-heads",
        "repeat-marker",
      ]),
    );
    expect(nodeIds).not.toContain("decoder-stack");

    const bidirectionalNode = graph.nodes.find(
      (node) => node.id === "bidirectional-mha",
    );
    expect(bidirectionalNode?.registryId).toBe(
      "module.bidirectional-attention",
    );
    expect(
      resolveGraphNodeLabel(bertMessages, bidirectionalNode?.labelKey ?? ""),
    ).toBe("Bidirectional\nMulti-Head\nAttention");

    const { nodes } = buildRegistryFlowGraph(graph, bertMessages);
    const labels = nodes.map((node) => node.data.label);
    expect(labels).toContain("WordPiece\nTokens");
    expect(labels).toContain("MLM &\nTask Heads");
    expect(labels).not.toContain("Decoder\nStack");

    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={bertMessages} isDev={false}>
        <PageAssetsProvider assets={bertAssets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={bertMessages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Bidirectional");
    expect(html).toContain("WordPiece");

    renderArchitectureGraph();
    expect(
      screen.getByLabelText(
        /BERT architecture diagram with WordPiece tokens flowing into token, position, and segment embeddings/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="bidirectional-mha"]'),
    ).toBeTruthy();
  });

  test("citations resolve for the model registry record", () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected model.bert in registry");
    }

    const citations = resolveCitations(model.citationIds);
    expect(citations.length).toBeGreaterThan(0);
    expect(citations[0]?.url).toContain("arxiv.org");
  });

  test("search and tag landing route readers to the canonical BERT model page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const document = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === MODEL_URL,
    );

    expect(document?.registryId).toBe(MODEL_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "BERT",
        "Bidirectional Encoder Representations from Transformers",
        "encoder-only transformer",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "model-family", "tokenization"]),
    );

    for (const query of [
      "Bidirectional Encoder Representations from Transformers",
      "bidirectional transformer encoder",
      "encoder-only transformer",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);
    }

    const bertResults = await docsSearchApi.search("BERT");
    expect(resultsIncludeUrl(bertResults, MODEL_URL)).toBe(true);

    const messages = await loadUiMessages();
    for (const tagSlug of ["model-family", "tokenization"] as const) {
      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const modelGroup = groups.find((group) => group.kind === "model");
      expect(
        modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
      ).toBe(true);
    }

    const tagPage = await TagLandingPage({
      params: Promise.resolve({ slug: "model-family" }),
    });
    const tagHtml = renderToStaticMarkup(tagPage);
    expect(tagHtml).toContain(`href="${MODEL_URL}"`);
    expect(tagHtml).not.toContain("No resources");
  });

  test("curated and derived related docs resolve published neighbors", () => {
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
      items.find((item) => item.registryId === "module.wordpiece")?.href,
    ).toBe("/docs/modules/wordpiece");

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
    expect(derivedHtml).toContain(
      'href="/docs/modules/bidirectional-attention"',
    );
  });

  test("rendered model page exposes graph, tags, references, and related docs without placeholders", async () => {
    const html = await renderModelPageHtml();

    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Bidirectional");
    expect(html).toContain("WordPiece");
    expect(html).toContain("MLM");
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/wordpiece"');
    expect(html).toContain(`href="${BERT_PAPER_URL}"`);
    expect(html).toContain("masked language modeling");
    expect(html).not.toContain("No modules listed yet.");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
  });
});
