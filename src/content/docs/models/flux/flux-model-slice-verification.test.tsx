/**
 * Consolidated review-facing slice proof for the Flux model page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, citation, architecture graph, search, and discovery behavior.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import { resolveCitations } from "@/lib/content/citations";
import { modelPageHref } from "@/lib/content/content-hrefs";
import { getDocsPageDir } from "@/lib/content/content-paths";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
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
import type { PageAssetConfig } from "@/lib/content/schemas";
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
import { resultsIncludeUrl } from "@/tests/search/helpers";

const MODEL_SLUG = "flux";
const MODEL_ID = "model.flux";
const MODEL_URL = modelPageHref(MODEL_SLUG);
const GRAPH_ID = "graph.flux-architecture";
const pageDir = getDocsPageDir("models", MODEL_SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const repoRoot = join(import.meta.dir, "../../../..");

const PRIMARY_SOURCE_CITATION_URLS = [
  "https://bfl.ai/blog/24-08-01-bfl",
  "https://github.com/black-forest-labs/flux",
  "https://huggingface.co/black-forest-labs/FLUX.1-dev",
  "https://github.com/black-forest-labs/flux2",
] as const;

const FLUX_DISCOVERY_QUERIES = [
  { query: "Flux", expectFirst: true },
  { query: "FLUX.1", expectFirst: true },
  { query: "Black Forest Labs", expectFirst: true },
  { query: "image generation model", expectFirst: false },
  { query: "diffusion transformer image model", expectFirst: true },
] as const;

const fluxMessages = JSON.parse(readFileSync(messagesPath, "utf8"));

const fluxAssets = {
  architectureGraph: {
    type: "graph",
    graphId: GRAPH_ID,
    webRenderer: "react-flow",
    printRenderer: "vertical-svg",
    altKey: "assets.architectureGraph.alt",
  },
} satisfies PageAssetConfig;

function renderArchitectureGraph() {
  return render(
    <PageMessagesProvider messages={fluxMessages} isDev={false}>
      <PageAssetsProvider assets={fluxAssets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={fluxMessages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
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

describe("Flux model slice verification (flux-model-page-current-main-006)", () => {
  afterEach(() => {
    cleanup();
  });

  test("registers Flux as a published image-generation model-family record with required aliases", () => {
    const flux = getModelById(MODEL_ID);

    expect(flux).toBeDefined();
    expect(flux?.kind).toBe("model");
    expect(flux?.slug).toBe("flux");
    expect(flux?.family).toBe("flux");
    expect(flux?.status).toBe("published");
    expect(flux?.modalities).toEqual(
      expect.arrayContaining(["text", "image", "multimodal"]),
    );
    expect(flux?.aliases).toEqual(
      expect.arrayContaining([
        "Flux",
        "FLUX.1",
        "FLUX.2",
        "Black Forest Labs Flux",
        "BFL Flux",
        "text-to-image Flux",
      ]),
    );
    expect(flux?.citationIds).toEqual(
      expect.arrayContaining([
        "citation.flux-bfl-announcement",
        "citation.flux-github-repository",
        "citation.flux-1-dev-huggingface",
        "citation.flux-2-github-repository",
      ]),
    );
    expect(flux?.releaseDate).toBe("2024-08-01");
  });

  test("connects Flux to shipped diffusion, transformer, conditioning, and CLIP records", async () => {
    const registry = await loadRegistry();
    const flux = getModelById(MODEL_ID);

    const requiredRelatedIds = [
      "concept.diffusion-model",
      "concept.denoising-generation",
      "concept.latent-space",
      "concept.classifier-free-guidance",
      "concept.text-to-image-conditioning",
      "concept.transformer-architecture",
      "concept.flow-matching",
      "model.clip",
      "module.diffusion-transformer-block",
      "paper.latent-diffusion",
      "paper.diffusion-transformers",
      "training-regime.diffusion-training-objective",
    ];

    expect(flux?.relatedIds).toEqual(
      expect.arrayContaining(requiredRelatedIds),
    );
    expect(flux?.moduleIds).toContain("module.diffusion-transformer-block");
    expect(flux?.paperIds).toEqual(
      expect.arrayContaining([
        "paper.latent-diffusion",
        "paper.diffusion-transformers",
      ]),
    );

    for (const relatedId of requiredRelatedIds) {
      expect(registry.byId.get(relatedId)?.status, relatedId).toBe("published");
    }
  });

  test("does not invent unsupported parameter metadata or Stable Diffusion links", async () => {
    const registry = await loadRegistry();
    const flux = getModelById(MODEL_ID);
    const stableDiffusion = registry.bySlug.get("stable-diffusion");

    expect(stableDiffusion).toBeUndefined();
    expect(flux?.parameterCount).toBeUndefined();
    expect(flux?.activeParameterCount).toBeUndefined();
    expect(
      flux?.relatedIds.some((relatedId) =>
        relatedId.includes("stable-diffusion"),
      ),
    ).toBe(false);
  });

  test("loads the canonical published Flux model bundle with rectified-flow lead copy", async () => {
    const record = getModelById(MODEL_ID);
    const page = await loadModelPage(MODEL_SLUG);

    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.registryId).toBe(MODEL_ID);
    expect(page.frontmatter.status).toBe("published");
    expect(record?.status).toBe("published");
    expect(record?.moduleIds).toEqual(
      expect.arrayContaining(["module.diffusion-transformer-block"]),
    );
    expect(record?.trainingRegimeIds).toEqual(
      expect.arrayContaining(["training-regime.diffusion-training-objective"]),
    );
    expect(page.messages.title).toBe("Flux");
    expect(page.messages.openingSummary).toContain("Black Forest Labs");
    expect(page.messages.openingSummary).toContain("rectified-flow");
    expect(page.messages.openingSummary).toContain("latent space");
  });

  test("renders module, training, related, graph, and references sections without empty placeholders", async () => {
    const html = await renderModelPageHtml();

    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/concepts/latent-space"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/concepts/classifier-free-guidance"');
    expect(html).toContain('href="/docs/models/clip"');
    expect(html).toContain('href="/docs/concepts/text-to-image-conditioning"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('id="important-modules"');
    expect(html).toContain("diffusion transformer");
    expect(html).toContain(
      'href="/docs/training/diffusion-training-objective"',
    );
    expect(html).toContain('id="references"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).not.toContain("No modules listed yet.");
    expect(html).not.toContain("No training regimes listed yet.");
    expect(html).not.toContain("No linked paper pages listed yet.");
  });

  test("resolves four primary BFL and open-weight source citations in registry order", () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected model.flux in registry");
    }

    expect(model.citationIds).toEqual([
      "citation.flux-bfl-announcement",
      "citation.flux-github-repository",
      "citation.flux-1-dev-huggingface",
      "citation.flux-2-github-repository",
    ]);

    const citations = resolveCitations(model.citationIds);
    expect(citations.map((citation) => citation.url)).toEqual([
      ...PRIMARY_SOURCE_CITATION_URLS,
    ]);
    expect(citations.every((citation) => citation.mla.length > 0)).toBe(true);
    expect(citations.every((citation) => citation.authors.length > 0)).toBe(
      true,
    );
    expect(new Set(citations.map((citation) => citation.url)).size).toBe(
      PRIMARY_SOURCE_CITATION_URLS.length,
    );
  });

  test("renders the references section with resolvable primary-source links", async () => {
    const html = await renderModelPageHtml();

    expect(html).toContain('id="references"');
    expect(html).toContain('data-testid="citation-list"');
    for (const url of PRIMARY_SOURCE_CITATION_URLS) {
      expect(html).toContain(`href="${url}"`);
    }
  });

  test("keeps page copy free of unsupported parameter-count or benchmark claims", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const prose = JSON.stringify(page.messages);

    expect(prose).not.toMatch(/\b\d+(\.\d+)?\s*billion\b/i);
    expect(prose).not.toMatch(/\b\d+B\b/);
    expect(prose).not.toMatch(/benchmark/i);
    expect(prose).toContain("rectified flow");
    expect(prose).toContain("non-commercial license");
  });

  test("registry graph record exposes text-to-image rectified-flow generation path", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("output-image");

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "text-prompt",
        "conditioning",
        "cross-attention",
        "cfg-guidance",
        "diffusion-transformer",
        "latent-denoising",
        "image-decoder",
        "output-image",
      ]),
    );
    expect(graph.edges.length).toBeGreaterThanOrEqual(7);
  });

  test("buildRegistryFlowGraph resolves diffusion transformer and rectified-flow emphasis", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const diffusionTransformerNode = graph.nodes.find(
      (node) => node.id === "diffusion-transformer",
    );
    const latentDenoisingNode = graph.nodes.find(
      (node) => node.id === "latent-denoising",
    );

    expect(diffusionTransformerNode?.registryId).toBe(
      "module.diffusion-transformer-block",
    );
    expect(latentDenoisingNode?.registryId).toBe(
      "concept.denoising-generation",
    );
    expect(
      resolveGraphNodeLabel(
        fluxMessages,
        diffusionTransformerNode?.labelKey ?? "",
      ),
    ).toBe("Diffusion\nTransformer");
    expect(
      resolveGraphNodeLabel(fluxMessages, latentDenoisingNode?.labelKey ?? ""),
    ).toBe("Rectified Flow\nLatent Updates");

    const { nodes } = buildRegistryFlowGraph(graph, fluxMessages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Diffusion\nTransformer");
    expect(labels).toContain("Rectified Flow\nLatent Updates");
    expect(labels).toContain("Generated\nImage");
    expect(labels).toContain("Text\nPrompt");
  });

  test("RegistryGraphFlow renders readable text-to-image markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={fluxMessages} isDev={false}>
        <PageAssetsProvider assets={fluxAssets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={fluxMessages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="diffusion-transformer"');
    expect(html).toContain('data-graph-node-id="latent-denoising"');
    expect(html).toContain('data-graph-node-id="text-prompt"');
    expect(html).toContain("Diffusion");
    expect(html).toContain("Rectified Flow");
    expect(html).toContain("Generated");
    expect(html).toContain(
      "Flux architecture diagram showing a text prompt encoded into conditioning features",
    );
  });

  test("hydrated graph exposes diffusion transformer and rectified-flow labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /Flux architecture diagram showing a text prompt encoded into conditioning features/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="diffusion-transformer"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="latent-denoising"]'),
    ).toBeTruthy();
    expect(document.querySelector(".react-flow__node")).toBeTruthy();
  });

  test("model page architecture section renders the registry-backed graph surface", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const html = await renderModelPageHtml();

    expect(page.messages.sections?.architecture.body).toContain(
      "latent image-generation pattern",
    );
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Diffusion");
    expect(html).toContain("Rectified Flow");
    expect(html).toContain("Generated");
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
        "Flux",
        "FLUX.1",
        "FLUX.2",
        "Black Forest Labs Flux",
        "Black Forest Labs",
        "text-to-image Flux",
        "diffusion transformer image model",
        "image generation model",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "model-family"]),
    );
    expect(document?.bodyText.length).toBeGreaterThan(200);
    expect(document?.relatedIds).toContain("concept.diffusion-model");
    expect(document?.relatedIds).toContain("model.clip");
    expect(document?.relatedIds).toContain(
      "concept.text-to-image-conditioning",
    );
  });

  for (const { query, expectFirst } of FLUX_DISCOVERY_QUERIES) {
    test(`search query ${query} returns the canonical Flux model page`, async () => {
      const results = await docsSearchApi.search(query);

      expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);

      if (expectFirst) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);
      }
    });
  }

  test.each([
    "model-family",
    "foundations",
  ] as const)("tag browsing lists Flux under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("curated related items resolve only to published adjacent targets", () => {
    const source = getRegistryRecordById(MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected model.flux in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.find((item) => item.registryId === "model.clip")?.href).toBe(
      "/docs/models/clip",
    );
    expect(
      items.find(
        (item) => item.registryId === "concept.text-to-image-conditioning",
      )?.href,
    ).toBe("/docs/concepts/text-to-image-conditioning");
    expect(
      items.find(
        (item) => item.registryId === "module.diffusion-transformer-block",
      )?.href,
    ).toBe("/docs/modules/diffusion-transformer-block");
    expect(
      items.find(
        (item) => item.registryId === "concept.classifier-free-guidance",
      )?.href,
    ).toBe("/docs/concepts/classifier-free-guidance");
    expect(
      items.find((item) => item.registryId === "concept.latent-space")?.href,
    ).toBe("/docs/concepts/latent-space");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      items.find((item) => item.registryId === "paper.diffusion-transformers")
        ?.href,
    ).toBeUndefined();
    expect(
      items
        .filter((item) => item.href !== undefined)
        .every((item) => item.href?.startsWith("/docs/")),
    ).toBe(true);
  });

  test("rendered related section offers diffusion, CLIP, and latent navigation paths", async () => {
    const curatedHtml = renderToStaticMarkup(
      createElement(RelatedDocs, { registryId: MODEL_ID }),
    );
    const derivedHtml = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: MODEL_ID,
        groups: [
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ],
      }),
    );
    const html = await renderModelPageHtml();

    expect(curatedHtml).toContain('data-testid="curated-related-docs"');
    expect(curatedHtml).toContain('href="/docs/models/clip"');
    expect(curatedHtml).toContain(
      'href="/docs/concepts/text-to-image-conditioning"',
    );
    expect(curatedHtml).toContain('href="/docs/glossary/diffusion-model"');
    expect(curatedHtml).toContain('href="/docs/concepts/latent-space"');
    expect(curatedHtml).toContain(
      'href="/docs/concepts/classifier-free-guidance"',
    );
    expect(curatedHtml).not.toContain(
      'href="/docs/papers/diffusion-transformers"',
    );
    expect(derivedHtml).toContain('data-testid="derived-related-docs"');
    expect(derivedHtml).toContain(
      'href="/docs/modules/diffusion-transformer-block"',
    );
    expect(derivedHtml).toContain(
      'href="/docs/training/diffusion-training-objective"',
    );
    expect(html).toContain("Flux");
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain('href="/docs/papers/diffusion-transformers"');
  });

  test("served model page renders title, sections, graph, tags, and references without errors", async () => {
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
          .getByRole("heading", { name: "Flux", exact: true })
          .waitFor({ state: "visible" });

        for (const sectionTitle of [
          "What It Is",
          "Inputs And Outputs",
          "Architecture",
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
