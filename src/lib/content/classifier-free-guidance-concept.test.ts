import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
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

const pageDir = getDocsPageDir("concepts", "classifier-free-guidance");
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/classifier-free-guidance";

describe("classifier-free-guidance concept discovery", () => {
  test("registry record stays published with guidance aliases, generation tags, and focused related ids", () => {
    const record = getConceptById("concept.classifier-free-guidance");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual([
      "Classifier-Free Guidance",
      "classifier-free guidance",
      "CFG",
      "diffusion guidance",
      "prompt guidance scale",
      "guidance scale",
    ]);
    expect(record?.tags).toEqual(["foundations", "taxonomy"]);
    expect(record?.conceptType).toBe("inference");
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.inference",
    );
    expect(record?.prerequisiteIds).toEqual([
      "concept.conditioning",
      "concept.denoising-generation",
      "concept.diffusion-model",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.conditioning",
      "concept.diffusion-model",
      "concept.denoising-generation",
      "model.clip",
      "paper.latent-diffusion",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.classifier-free-guidance"),
    ).toBe(true);
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(
        "concept.classifier-free-guidance",
      ),
    ).toBe(true);
  });

  test("curated related links point to diffusion generation foundations", () => {
    const source = getConceptById("concept.classifier-free-guidance");
    if (!source) {
      throw new Error("expected concept.classifier-free-guidance in registry");
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
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(
      items.find((item) => item.registryId === "concept.denoising-generation")
        ?.href,
    ).toBe("/docs/glossary/denoising-generation");
    expect(items.find((item) => item.registryId === "model.clip")?.href).toBe(
      "/docs/models/clip",
    );
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(items.some((item) => item.registryId === "module.attention")).toBe(
      false,
    );
    expect(
      items.some((item) => item.registryId === "concept.transformer"),
    ).toBe(false);
  });

  test("search index records classifier-free guidance with aliases and generation tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["CFG", "guidance scale", "diffusion guidance"]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "taxonomy"]),
    );
  });

  test("search finds classifier-free guidance by title, aliases, and body terms", async () => {
    for (const query of [
      "Classifier-Free Guidance",
      "CFG",
      "guidance scale",
      "unconditional prediction",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });

  test("classifier-free guidance search ranks the canonical concept page ahead of conditioning", async () => {
    const results = await docsSearchApi.search("classifier-free guidance");
    expect(results[0]?.url).toBe(CONCEPT_URL);
  });
});

describe("classifier-free-guidance concept page", () => {
  test("messages teach conditional and unconditional predictions with guidance-scale blending", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Classifier-Free Guidance");
    expect(messages.openingSummary?.toLowerCase()).toContain(
      "prompt is present",
    );
    expect(messages.openingSummary?.toLowerCase()).toContain(
      "prompt is dropped",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "conditional prediction",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "unconditional prediction",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "guidance scale",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "latent diffusion",
    );
    expect(messages.sections?.whereItAppears.body?.toLowerCase()).toContain(
      "latent diffusion",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "classifier guidance",
    );
  });

  test("page renders title, sections, opening summary, and diffusion related links", async () => {
    const page = await loadConceptPage("classifier-free-guidance");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(
      "concept.classifier-free-guidance",
    );
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
    expect(html).toContain("Why It Matters");
    expect(html).toContain("conditional prediction");
    expect(html).toContain("guidance scale");
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('href="/docs/models/clip"');
    expect(html).toContain('href="/docs/papers/latent-diffusion"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});
