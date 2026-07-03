import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "@/app/docs/docs-slug-renderer";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.video-generation";
const CONCEPT_URL = "/docs/concepts/video-generation";
const GENERATION_PATHS_GRAPH_ID = "graph.video-generation-paths";
const pageDir = getDocsPageDir("concepts", "video-generation");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("video-generation concept discovery (video-generation-concept-page-001)", () => {
  test("registry record is published with generation aliases, modality tags, and focused related ids", () => {
    const record = getConceptById(REGISTRY_ID);

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("video-generation");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([
      "video generation",
      "text to video",
      "text-to-video",
      "generated video",
      "video synthesis",
      "temporal consistency",
      "visual token generation",
    ]);
    expect(record?.tags).toEqual(["taxonomy", "foundations", "model-family"]);
    expect(record?.conceptType).toBe("general");
    expect(record?.sidebarGrouping?.concepts).toBe("architecture");
    expect(record?.prerequisiteIds).toEqual([
      "concept.generative-model",
      "concept.modality",
      "concept.diffusion-model",
      "concept.autoregressive-generation",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.diffusion-model",
      "concept.autoregressive-generation",
      "concept.conditioning",
      "concept.generative-model",
      "concept.modality",
      "model.ltx-23",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.ltx-2-efficient-joint-audio-visual-foundation-model",
      "citation.denoising-diffusion-probabilistic-models",
    ]);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("curated related links resolve only to existing diffusion, autoregressive, and video model or paper targets", () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected concept.video-generation in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
    expect(items.find((item) => item.registryId === "model.ltx-23")?.href).toBe(
      "/docs/models/ltx-23",
    );
    expect(
      items.some((item) => item.registryId === "concept.visual-tokenization"),
    ).toBe(false);
    expect(items.some((item) => item.registryId === "paper.ltx-2")).toBe(false);
  });

  test("related ids resolve to published registry records", async () => {
    const indexes = await loadRegistry();
    const record = getConceptById(REGISTRY_ID);

    for (const relatedId of record?.relatedIds ?? []) {
      expect(indexes.byId.has(relatedId)).toBe(true);
    }
  });

  test("search index records video generation with aliases and taxonomy tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "video generation",
        "text to video",
        "temporal consistency",
        "visual token generation",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["taxonomy", "foundations", "model-family"]),
    );
  });

  test("live search routes video generation aliases to the canonical concept page", async () => {
    for (const query of [
      "video generation",
      "text to video",
      "temporal consistency",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });

  test("page bundle resolves from getDocsPageDir", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.pageDir === pageDir);

    expect(page?.url).toBe(CONCEPT_URL);
    expect(page?.frontmatter.registryId).toBe(REGISTRY_ID);
  });
});

describe("video-generation concept page (video-generation-concept-page-002)", () => {
  test("messages define video generation with opening summary and reader-facing sections", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Video generation");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "moving visual sequence",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "time",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "text-to-video",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "diffusion",
    );
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "video-generation",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: CONCEPT_URL,
      languages: {
        en: CONCEPT_URL,
      },
    });
    expect(metadata.title).toContain("Video generation");

    const rendered = await renderDocsSlugPage(
      ["concepts", "video-generation"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("page renders title, opening summary, sections, tags, related docs, and references", async () => {
    const page = await loadConceptPage("video-generation");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html.toLowerCase()).toContain("video generation");
    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("moving visual sequence");
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/models/ltx-23"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
  });
});

describe("video-generation temporal consistency and conditioning (video-generation-concept-page-003)", () => {
  test("messages explain time, temporal consistency outcomes, conditioning, and image contrast", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const whatItIs = messages.sections?.whatItIs.body?.toLowerCase() ?? "";
    const whyItMatters =
      messages.sections?.whyItMatters.body?.toLowerCase() ?? "";
    const simpleExample =
      messages.sections?.simpleExample.body?.toLowerCase() ?? "";
    const commonConfusions =
      messages.sections?.commonConfusions.body?.toLowerCase() ?? "";

    expect(whatItIs).toContain("visual state changes over time");
    expect(whyItMatters).toContain("temporal consistency");
    expect(whyItMatters).toContain("stable identity");
    expect(whyItMatters).toContain("object location");
    expect(whyItMatters).toContain("camera motion");
    expect(whyItMatters).toContain("physical continuity");
    expect(whyItMatters).toContain("conditioning");
    expect(whyItMatters).toContain("reference image");
    expect(whyItMatters).toContain("previous frames");
    expect(simpleExample).toContain("temporal consistency");
    expect(commonConfusions).toContain("more pixels");
    expect(commonConfusions).toContain("more compute");
    expect(commonConfusions).toContain("previous frames");
  });

  test("rendered page surfaces temporal consistency and conditioning prose", async () => {
    const page = await loadConceptPage("video-generation");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html.toLowerCase()).toContain("temporal consistency");
    expect(html.toLowerCase()).toContain("visual state changes over time");
    expect(html.toLowerCase()).toContain("conditioning");
    expect(html.toLowerCase()).toContain("physical continuity");
    expect(html.toLowerCase()).toContain("more pixels");
    expect(html).not.toContain("benchmark");
    expect(html).not.toContain("leaderboard");
  });
});

describe("video-generation frame and token paths (video-generation-concept-page-004)", () => {
  test("messages explain frame-level generation, visual tokens, and diffusion versus autoregressive paths", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const generationPaths =
      messages.sections?.generationPaths.body?.toLowerCase() ?? "";

    expect(generationPaths).toContain("frame-level generation");
    expect(generationPaths).toContain("adjacent frames must agree");
    expect(generationPaths).toContain("visual-token generation");
    expect(generationPaths).toContain("discrete or continuous tokens");
    expect(generationPaths).toContain("space and time");
    expect(generationPaths).toContain("diffusion-style");
    expect(generationPaths).toContain("autoregressive-style");
    expect(generationPaths).not.toContain("leaderboard");
    expect(generationPaths).not.toContain("benchmark");
  });

  test("generation paths graph asset, caption, and registry subject resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.generationPathsMap).toMatchObject({
      type: "graph",
      graphId: GENERATION_PATHS_GRAPH_ID,
      altKey: "assets.generationPathsMap.alt",
      captionKey: "assets.generationPathsMap.caption",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(GENERATION_PATHS_GRAPH_ID)?.subjectId).toBe(
      REGISTRY_ID,
    );
    expect(messages.assets?.generationPathsMap?.alt).toContain(
      "frame-level video generation",
    );
    expect(messages.graph?.nodes?.frameLevel?.label).toContain("Frame-level");
    expect(messages.graph?.nodes?.visualTokens?.label).toContain(
      "Visual-token",
    );
  });

  test("rendered page surfaces generation-path prose and graph asset wiring", async () => {
    const page = await loadConceptPage("video-generation");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Frame And Token Generation Paths");
    expect(html.toLowerCase()).toContain("frame-level generation");
    expect(html.toLowerCase()).toContain("visual-token generation");
    expect(html.toLowerCase()).toContain("adjacent frames must agree");
    expect(html.toLowerCase()).toContain("diffusion-style");
    expect(html.toLowerCase()).toContain("autoregressive-style");
    expect(html).toContain('data-graph-id="graph.video-generation-paths"');
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
  });
});
