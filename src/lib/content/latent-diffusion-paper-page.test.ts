import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { PAPERS_DOCS_ROOT } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadPaperPage } from "@/lib/content/paper-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getPaperById,
  getRegistryRecordById,
} from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { resultsIncludeUrl } from "@/tests/search/helpers";

const LATENT_DIFFUSION_SLUG = "latent-diffusion" as const;
const LATENT_DIFFUSION_URL = "/docs/papers/latent-diffusion" as const;

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

function renderPaperHtml() {
  return loadPaperPage(LATENT_DIFFUSION_SLUG).then(async (page) =>
    renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    ),
  );
}

describe("latent-diffusion paper page (latent-diffusion-paper-page-003)", () => {
  test("messages include required paper template keys", () => {
    const messagesPath = join(
      PAPERS_DOCS_ROOT,
      LATENT_DIFFUSION_SLUG,
      "messages/en.json",
    );
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Latent Diffusion Models");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
    expect(
      messages.sections?.methodOrArchitecture.body?.length,
    ).toBeGreaterThan(0);
    expect(messages.sections?.evidence.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.limitations.body?.length).toBeGreaterThan(0);
    expect(messages.description).not.toMatch(/placeholder|coming later/i);
    expect(messages.openingSummary).toContain("Stable Diffusion");
  });

  test("paper page compiles with at-a-glance, sections, related docs, tags, and citations", async () => {
    const page = await loadPaperPage(LATENT_DIFFUSION_SLUG);

    expect(page.frontmatter.kind).toBe("paper");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("paper.latent-diffusion");

    const html = await renderPaperHtml();

    expect(html).toContain("Latent Diffusion Models");
    expect(html).toContain("Stable Diffusion");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/docs/concepts/latent-space"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("paper.latent-diffusion is published and discoverable through search", async () => {
    const record = getPaperById("paper.latent-diffusion");
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("paper.latent-diffusion")).toBe(
      true,
    );

    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const paperDoc = documents.find((doc) => doc.url === LATENT_DIFFUSION_URL);
    expect(paperDoc?.kind).toBe("paper");

    const searchResults = await docsSearchApi.search("latent diffusion");
    expect(resultsIncludeUrl(searchResults, LATENT_DIFFUSION_URL)).toBe(true);
  });

  test("contribution graph resolves for the paper asset", () => {
    const graph = getGraphById("graph.latent-diffusion-contribution");
    expect(graph?.subjectId).toBe("paper.latent-diffusion");
    expect(graph?.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        "autoencoder",
        "latentDenoising",
        "conditioning",
        "decoder",
      ]),
    );
  });
});

describe("latent-diffusion paper page (latent-diffusion-paper-page-004)", () => {
  test("explainer prose covers autoencoder, latent denoising, conditioning, and pixel contrast", () => {
    const messagesPath = join(
      PAPERS_DOCS_ROOT,
      LATENT_DIFFUSION_SLUG,
      "messages/en.json",
    );
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const method = messages.sections?.methodOrArchitecture.body ?? "";
    const why = messages.sections?.whyItMatters.body ?? "";
    const evidence = messages.sections?.evidence.body ?? "";

    expect(messages.openingSummary).toMatch(/Latent Diffusion Models \(LDM\)/);
    expect(method).toMatch(/autoencoder/i);
    expect(method).toMatch(/learned latent/i);
    expect(method).toMatch(/decode/i);
    expect(method).toMatch(/iterative denoising/i);
    expect(method).toMatch(/main generation loop/i);
    expect(method).toMatch(/Conditioning/i);
    expect(why).toMatch(/pixel-space diffusion/i);
    expect(why).toMatch(/compute/i);
    expect(why).toMatch(/memory/i);
    expect(evidence).toMatch(/architectural/i);
    expect(evidence).not.toMatch(/F1|BLEU|ImageNet score/i);
  });

  test("rendered explainer auto-links conditioning and latent-space concepts in body prose", async () => {
    const html = await renderPaperHtml();

    expect(html).toContain('data-prose-auto-link="true"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/concepts/latent-space"');
    expect(html).not.toMatch(/on this page|reader shortcut/i);
  });
});

describe("latent-diffusion paper page (latent-diffusion-paper-page-005)", () => {
  const messagesPath = join(
    PAPERS_DOCS_ROOT,
    LATENT_DIFFUSION_SLUG,
    "messages/en.json",
  );
  const assetsPath = join(
    PAPERS_DOCS_ROOT,
    LATENT_DIFFUSION_SLUG,
    "assets.json",
  );

  test("contribution graph asset resolves with message-backed alt and caption", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.contributionGraph.type).toBe("graph");
    if (assets.contributionGraph.type === "graph") {
      expect(assets.contributionGraph.graphId).toBe(
        "graph.latent-diffusion-contribution",
      );
    }
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(messages.assets?.contributionGraph?.alt).toMatch(
      /compression|denois/i,
    );
    expect(messages.assets?.contributionGraph?.caption).toMatch(
      /pipeline|flow|chain/i,
    );
  });

  test("contribution graph encodes sequential pipeline data-flow stages", () => {
    const graph = getGraphById("graph.latent-diffusion-contribution");
    const edgePairs =
      graph?.edges.map((edge) => `${edge.source}->${edge.target}`) ?? [];

    expect(edgePairs).toContain("inputImage->autoencoder");
    expect(edgePairs).toContain("autoencoder->latentDenoising");
    expect(edgePairs).toContain("latentDenoising->decoder");
    expect(edgePairs).toContain("conditioning->latentDenoising");
    expect(graph?.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        "inputImage",
        "autoencoder",
        "latentDenoising",
        "conditioning",
        "decoder",
      ]),
    );
  });

  test("rendered page includes contribution graph with pipeline stage labels", async () => {
    const html = await renderPaperHtml();

    expect(html).toContain('data-page-asset="contributionGraph"');
    expect(html).toContain(
      'data-graph-id="graph.latent-diffusion-contribution"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Input image");
    expect(html).toContain("Autoencoder compression");
    expect(html).toContain("Latent denoising loop");
    expect(html).toContain("Conditioning inputs");
    expect(html).toContain("Decode to pixels");
    expect(html).toContain(
      "Generation flows from input image compression into latent denoising",
    );
  });
});

describe("latent-diffusion paper page (latent-diffusion-paper-page-006)", () => {
  test.each([
    "Latent Diffusion Models",
    "Stable Diffusion paper",
    "latent-space denoising",
  ] as const)("%s query surfaces the canonical paper page through search", async (query) => {
    const searchResults = await docsSearchApi.search(query);

    expect(resultsIncludeUrl(searchResults, LATENT_DIFFUSION_URL)).toBe(true);
    expect(searchResults[0]?.url).toBe(LATENT_DIFFUSION_URL);
  });

  test("latent diffusion query surfaces the concept page first and still includes the paper", async () => {
    const searchResults = await docsSearchApi.search("latent diffusion");

    expect(searchResults[0]?.url).toBe("/docs/concepts/latent-space");
    expect(resultsIncludeUrl(searchResults, LATENT_DIFFUSION_URL)).toBe(true);
  });

  test("paper registry record, citation, tags, and relationships resolve", () => {
    const record = getPaperById("paper.latent-diffusion");
    expect(record?.tags).toEqual(["foundations", "model-family"]);
    expect(record?.citationIds).toEqual(["citation.latent-diffusion-models"]);

    for (const relatedId of record?.relatedIds ?? []) {
      if (relatedId.startsWith("citation.")) {
        expect(getCitationById(relatedId)?.id).toBe(relatedId);
        continue;
      }
      expect(getRegistryRecordById(relatedId)?.id).toBe(relatedId);
    }

    const citation = getCitationById("citation.latent-diffusion-models");
    expect(citation?.status).toBe("published");
    expect(citation?.title).toContain("Latent Diffusion Models");
  });

  test("page bundle asset references validate against local messages", () => {
    const messagesPath = join(
      PAPERS_DOCS_ROOT,
      LATENT_DIFFUSION_SLUG,
      "messages/en.json",
    );
    const assetsPath = join(
      PAPERS_DOCS_ROOT,
      LATENT_DIFFUSION_SLUG,
      "assets.json",
    );
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });

  test("rendered page shows title, summary, sections, related docs, tags, references, and graph without placeholders", async () => {
    const page = await loadPaperPage(LATENT_DIFFUSION_SLUG);
    const html = await renderPaperHtml();

    expect(page.messages.openingSummary).toContain(
      "Stable Diffusion-style image generation",
    );
    expect(html).toContain("Latent Diffusion Models");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Method Or Architecture");
    expect(html).toContain("Evidence");
    expect(html).toContain("Limitations");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-page-asset="contributionGraph"');
    expect(html).toContain('id="references"');
    expect(html).toContain('href="/docs/concepts/latent-space"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).not.toMatch(/placeholder|coming later|todo/i);
  });
});
