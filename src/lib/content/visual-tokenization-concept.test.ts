import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = getDocsPageDir("concepts", "visual-tokenization");
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/visual-tokenization";

describe("visual-tokenization concept discovery (visual-tokenization-concept-page-001)", () => {
  test("registry record stays published with visual-token aliases, tokenization tags, and focused related ids", () => {
    const record = getConceptById("concept.visual-tokenization");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Visual tokenization",
      "visual tokenization",
      "image tokenization",
      "video tokenization",
      "visual tokens",
      "patch tokens",
      "discrete visual codes",
      "latent visual tokens",
    ]);
    expect(record?.tags).toEqual(["tokenization", "foundations", "taxonomy"]);
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.architecture",
    );
    expect(record?.prerequisiteIds).toEqual([
      "concept.modality",
      "concept.representation",
      "concept.patch",
    ]);
    expect(record?.relatedIds).toEqual([
      "module.clip-image-tokenization",
      "concept.tokenizers-overview",
      "concept.autoregressive-generation",
      "concept.diffusion-model",
      "model.ltx-23",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.image-is-worth-16x16-words",
      "citation.learning-transferable-visual-models-from-natural-language-supervision",
      "citation.neural-discrete-representation-learning",
      "citation.latent-diffusion-models",
      "citation.ltx-2-efficient-joint-audio-visual-foundation-model",
    ]);
    expect(record?.explainsIds).toEqual(["module.clip-image-tokenization"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.visual-tokenization")).toBe(
      true,
    );
  });

  test("curated related links point to CLIP, tokenization, generation, diffusion, and video paths", () => {
    const source = getConceptById("concept.visual-tokenization");
    if (!source) {
      throw new Error("expected concept.visual-tokenization in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.clip-image-tokenization")
        ?.href,
    ).toBe("/docs/modules/clip-image-tokenization");
    expect(
      items.find((item) => item.registryId === "concept.tokenizers-overview")
        ?.href,
    ).toBe("/docs/concepts/tokenizers-overview");
    expect(
      items.find(
        (item) => item.registryId === "concept.autoregressive-generation",
      )?.href,
    ).toBe("/docs/glossary/autoregressive-generation");
    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(items.find((item) => item.registryId === "model.ltx-23")?.href).toBe(
      "/docs/models/ltx-23",
    );
  });
});

describe("visual-tokenization concept page (visual-tokenization-concept-page-002)", () => {
  test("messages define visual tokenization and the three representation families in isolation-first prose", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Visual tokenization");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "image or video-frame pixels",
    );
    expect(
      messages.sections?.representationForms.body?.toLowerCase(),
    ).toContain("splits an image or frame into");
    expect(
      messages.sections?.representationForms.body?.toLowerCase(),
    ).toContain("spatial regions");
    expect(
      messages.sections?.representationForms.body?.toLowerCase(),
    ).toContain("embedding");
    expect(
      messages.sections?.representationForms.body?.toLowerCase(),
    ).toContain("discrete-code tokenization");
    expect(
      messages.sections?.representationForms.body?.toLowerCase(),
    ).toContain("codebook");
    expect(
      messages.sections?.representationForms.body?.toLowerCase(),
    ).toContain("autoregressive generation");
    expect(
      messages.sections?.representationForms.body?.toLowerCase(),
    ).toContain("clip image tokenization");
    expect(
      messages.sections?.representationForms.body?.toLowerCase(),
    ).toContain("diffusion models");
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "text tokenization",
    );
  });

  test("search index records visual-tokenization with aliases and tokenization tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "visual tokenization",
        "image tokenization",
        "patch tokens",
        "discrete visual codes",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["tokenization", "foundations", "taxonomy"]),
    );
  });

  test("search finds visual tokenization by title, aliases, and representation terms", async () => {
    for (const query of [
      "visual tokenization",
      "patch tokens",
      "discrete visual codes",
      "latent visual tokens",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });

  test("page renders title, sections, opening summary, tags, and curated related docs", async () => {
    const page = await loadConceptPage("visual-tokenization");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.visual-tokenization");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Main Representation Forms");
    expect(html).toContain("Patch tokenization splits");
    expect(html).toContain("Discrete-code tokenization maps");
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/modules/clip-image-tokenization"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/models/ltx-23"');
    expect(html).toContain('href="/tags/tokenization"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

describe("visual-tokenization representation comparison (visual-tokenization-concept-page-003)", () => {
  test("assets wire a message-backed comparison table for patch, discrete, and latent forms", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.assets?.representationFormsComparison?.caption).toContain(
      "patch tokens",
    );
    expect(messages.tables?.representationForms?.dimensions?.sourceData).toBe(
      "Source data",
    );
    expect(
      messages.tables?.representationForms?.values?.patchTokens?.tokenForm,
    ).toContain("embedding");
    expect(
      messages.tables?.representationForms?.values?.discreteCodes?.tokenForm,
    ).toContain("codebook");
    expect(
      messages.tables?.representationForms?.values?.latentTokens
        ?.commonModelUse,
    ).toContain("diffusion");
  });

  test("page renders the representation-forms comparison table with accessible labels", async () => {
    const page = await loadConceptPage("visual-tokenization");
    const comparisonAsset = page.assets.representationFormsComparison;

    expect(comparisonAsset?.type).toBe("table");
    if (comparisonAsset?.type !== "table") {
      throw new Error("expected representationFormsComparison table asset");
    }
    expect(comparisonAsset.tableId).toBe(
      "table.visual-tokenization-representation-forms-comparison",
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain(
      'data-table-id="table.visual-tokenization-representation-forms-comparison"',
    );
    expect(html).toContain("Patch tokens");
    expect(html).toContain("Discrete visual codes");
    expect(html).toContain("Latent visual tokens");
    expect(html).toContain("Source data");
    expect(html).toContain("Token form");
    expect(html).toContain("Common model use");
    expect(html).toContain("Main tradeoff");
    expect(html).toContain('href="/docs/modules/clip-image-tokenization"');
    expect(html).toContain(
      "How patch tokens, discrete visual codes, and latent visual tokens differ",
    );
  });
});

describe("visual-tokenization journey links (visual-tokenization-concept-page-004)", () => {
  test("messages name nearby CLIP, autoregressive, diffusion, and video paths in prose", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.sections?.nearbySystems.body?.toLowerCase()).toContain(
      "clip image tokenization",
    );
    expect(messages.sections?.nearbySystems.body?.toLowerCase()).toContain(
      "autoregressive generation",
    );
    expect(messages.sections?.nearbySystems.body?.toLowerCase()).toContain(
      "diffusion models",
    );
    expect(messages.sections?.nearbySystems.body?.toLowerCase()).toContain(
      "ltx-2.3",
    );
    expect(
      messages.relatedDocs?.["module.clip-image-tokenization"]?.reason,
    ).toContain("patch-token");
    expect(
      messages.relatedDocs?.["concept.autoregressive-generation"]?.reason,
    ).toContain("discrete");
    expect(messages.relatedDocs?.["concept.diffusion-model"]?.reason).toContain(
      "latent",
    );
    expect(messages.relatedDocs?.["model.ltx-23"]?.reason).toContain("video");
  });

  test("page renders in-page and curated links to CLIP, autoregressive, diffusion, and video paths", async () => {
    const page = await loadConceptPage("visual-tokenization");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Nearby Encoding And Generation Paths");
    expect(html).toContain('data-prose-auto-link="true"');
    expect(html).toContain('href="/docs/modules/clip-image-tokenization"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/models/ltx-23"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("patch-token");
    expect(html).toContain("symbol by symbol");
  });
});
