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

const pageDir = getDocsPageDir("concepts", "text-to-image-conditioning");
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/text-to-image-conditioning";
const CLIP_PAPER_URL =
  "/docs/papers/learning-transferable-visual-models-from-natural-language-supervision";

const DISCOVERY_HREFS = [
  "/docs/glossary/conditioning",
  "/docs/glossary/denoising-generation",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/latent-space",
  "/docs/models/clip",
  "/docs/papers/latent-diffusion",
] as const;

describe("text-to-image-conditioning concept page (text-to-image-conditioning-concept-page-002)", () => {
  test("messages teach conditioning mechanism, CLIP history, and denoising distinctions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const whatItIs = messages.sections?.whatItIs.body?.toLowerCase() ?? "";
    const simpleExample =
      messages.sections?.simpleExample.body?.toLowerCase() ?? "";
    const whereItAppears =
      messages.sections?.whereItAppears.body?.toLowerCase() ?? "";
    const commonConfusions =
      messages.sections?.commonConfusions.body?.toLowerCase() ?? "";

    expect(messages.openingSummary?.toLowerCase()).toContain(
      "extra information",
    );
    expect(whatItIs).toContain("extra information supplied");
    expect(whatItIs).toContain("text encoder");
    expect(whatItIs).toContain("vectors");
    expect(whatItIs).toContain("denoising updates");
    expect(whatItIs).toContain("guidance input");
    expect(whatItIs).toContain("denoising is the separate");

    expect(simpleExample).toContain("denoising step");
    expect(simpleExample).toContain("conditioning vectors");

    expect(whereItAppears).toContain("clip-style");
    expect(whereItAppears).toContain("contrastive");
    expect(whereItAppears).toContain("shared embedding");
    expect(whereItAppears).toContain("other text encoders");
    expect(whereItAppears).toContain("multimodal");

    expect(commonConfusions).toContain("prompt engineering");
    expect(commonConfusions).toContain("classifier-free guidance");
    expect(commonConfusions).toContain("clip");
    expect(commonConfusions).toContain("diffusion model objective");
    expect(commonConfusions).toContain("not the loss function");
  });

  test("page renders core teaching sections without missing-content placeholders", async () => {
    const page = await loadConceptPage("text-to-image-conditioning");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(
      "concept.text-to-image-conditioning",
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Simple Example");
    expect(html).toContain("Where It Appears");
    expect(html).toContain("Common Confusions");
    expect(html).toContain("extra information");
    expect(html).toContain("CLIP-style");
    expect(html).toContain("classifier-free guidance");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing content");
    expect(CONCEPT_URL).toBe("/docs/concepts/text-to-image-conditioning");
  });
});

describe("text-to-image-conditioning concept discovery (text-to-image-conditioning-concept-page-003)", () => {
  test("registry record exposes aliases, tags, and curated relationships to nearby diffusion material", () => {
    const record = getConceptById("concept.text-to-image-conditioning");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("text-to-image-conditioning");
    expect(record?.aliases).toEqual([
      "text-to-image conditioning",
      "text conditioning",
      "prompt conditioning",
      "text prompt steering",
    ]);
    expect(record?.tags).toEqual(["foundations", "taxonomy", "model-family"]);
    expect(record?.relatedIds).toEqual([
      "concept.conditioning",
      "concept.denoising-generation",
      "concept.diffusion-model",
      "concept.latent-space",
      "model.clip",
      "paper.latent-diffusion",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.learning-transferable-visual-models-from-natural-language-supervision",
      "citation.latent-diffusion-models",
      "citation.classifier-free-diffusion-guidance",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.text-to-image-conditioning"),
    ).toBe(true);
  });

  test("curated related links resolve to conditioning, CLIP, latent diffusion, and diffusion foundations", () => {
    const source = getConceptById("concept.text-to-image-conditioning");
    if (!source) {
      throw new Error(
        "expected concept.text-to-image-conditioning in registry",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
    expect(
      items.find((item) => item.registryId === "concept.denoising-generation")
        ?.href,
    ).toBe("/docs/glossary/denoising-generation");
    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(
      items.find((item) => item.registryId === "concept.latent-space")?.href,
    ).toBe("/docs/glossary/latent-space");
    expect(items.find((item) => item.registryId === "model.clip")?.href).toBe(
      "/docs/models/clip",
    );
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
  });

  test("search index records text-to-image-conditioning aliases and diffusion tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "text conditioning",
        "prompt conditioning",
        "text prompt steering",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "taxonomy", "model-family"]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.conditioning",
        "model.clip",
        "paper.latent-diffusion",
      ]),
    );
  });

  test("search finds text-to-image conditioning by title and prompt-steering aliases", async () => {
    for (const query of [
      "text-to-image conditioning",
      "text conditioning",
      "prompt conditioning",
      "text prompt steering",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });

  test("contrastive image text search still routes to the CLIP paper ahead of the conditioning page", async () => {
    const results = await docsSearchApi.search("contrastive image text");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(CLIP_PAPER_URL);
  });

  test("page renders registry-backed related links, citations, and discovery surfaces", async () => {
    const page = await loadConceptPage("text-to-image-conditioning");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    for (const href of DISCOVERY_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).toContain("Classifier-Free Diffusion Guidance");
    expect(html).toContain("Latent Diffusion Models");
    expect(html).toContain(
      "Learning Transferable Visual Models From Natural Language Supervision",
    );
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
  });
});
