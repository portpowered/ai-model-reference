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

const pageDir = getDocsPageDir("concepts", "latent-space");
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/latent-space";

const DISCOVERY_ALIAS_QUERIES = [
  ["latent manifold"],
  ["compressed representation"],
  ["latent representation"],
  ["latent diffusion"],
] as const;

describe("latent-space concept discovery (latent-space-concept-page-001)", () => {
  test("registry record stays published with representation aliases, diffusion tags, and focused related ids", () => {
    const record = getConceptById("concept.latent-space");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("latent-space");
    expect(record?.conceptType).toBe("architecture");
    expect(record?.aliases).toEqual([
      "latent manifold",
      "compressed representation",
      "compressed representation space",
      "latent representation",
      "latent representation space",
      "latent diffusion",
    ]);
    expect(record?.tags).toEqual(["foundations", "taxonomy", "model-family"]);
    expect(record?.relatedIds).toEqual([
      "concept.diffusion-model",
      "concept.denoising-generation",
      "concept.conditioning",
      "paper.latent-diffusion",
      "concept.embedding",
      "concept.latent",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.latent-space")).toBe(true);
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.latent-space"),
    ).toBe(true);
  });

  test("curated related links point to diffusion, conditioning, paper, embedding, and latent peers", () => {
    const source = getConceptById("concept.latent-space");
    if (!source) {
      throw new Error("expected concept.latent-space in registry");
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
      items.find((item) => item.registryId === "concept.denoising-generation")
        ?.href,
    ).toBe("/docs/glossary/denoising-generation");
    expect(
      items.find((item) => item.registryId === "concept.conditioning")?.href,
    ).toBe("/docs/glossary/conditioning");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      items.find((item) => item.registryId === "concept.embedding")?.href,
    ).toBe("/docs/concepts/embedding");
    expect(
      items.find((item) => item.registryId === "concept.latent")?.href,
    ).toBe("/docs/glossary/latent");
    expect(
      items.some((item) => item.registryId === "model.stable-diffusion"),
    ).toBe(false);
    expect(
      items.some((item) => item.registryId === "concept.generative-model"),
    ).toBe(false);
    expect(items.some((item) => item.registryId === "concept.encoder")).toBe(
      false,
    );
  });

  test("search index records latent-space with aliases and diffusion tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.registryId).toBe("concept.latent-space");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "latent manifold",
        "compressed representation",
        "latent representation",
        "latent diffusion",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "taxonomy", "model-family"]),
    );
  });

  test.each(
    DISCOVERY_ALIAS_QUERIES,
  )("live search routes %s to the latent-space concept page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
  });
});

describe("latent-space concept page (latent-space-concept-page-002)", () => {
  test("messages include required concept template keys", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Latent Space");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.commonConfusions.body?.length).toBeGreaterThan(0);
    expect(messages.description).not.toContain("Draft placeholder");
  });

  test("page renders title, sections, opening summary, and diffusion-related links", async () => {
    const page = await loadConceptPage("latent-space");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.latent-space");
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
    expect(html).toContain("compressed representations");
    expect(html).toContain("latent diffusion");
    expect(html).toContain("denoising");
    expect(html).toContain("decode");
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/papers/latent-diffusion"');
    expect(html).toContain('href="/docs/concepts/embedding"');
    expect(html).toContain('href="/docs/glossary/latent"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Draft placeholder");
  });
});

describe("latent-space compressed representation teaching (latent-space-concept-page-003)", () => {
  test("messages explain compressed latents, latent diffusion flow, and practical denoising advantages", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const body = [
      messages.openingSummary,
      messages.sections?.whatItIs.body,
      messages.sections?.whyItMatters.body,
      messages.sections?.simpleExample.body,
      messages.sections?.commonConfusions.body,
    ].join(" ");

    expect(body).toMatch(/compressed/i);
    expect(body).toMatch(/latent diffusion/i);
    expect(body).toMatch(/denois/i);
    expect(body).toMatch(/decode/i);
    expect(body).toMatch(/conditioning/i);
    expect(body).toMatch(/pixel/i);
    expect(body).toMatch(/compute|memory/i);
    expect(body).not.toMatch(/benchmark|leaderboard/i);
    expect(body).toMatch(
      /not guaranteed to preserve every pixel|not lossless|blur fine detail/i,
    );
  });

  test("rendered page surfaces latent diffusion flow without benchmark framing", async () => {
    const page = await loadConceptPage("latent-space");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("compressed representations");
    expect(html).toContain("latent diffusion");
    expect(html).toContain("conditioning");
    expect(html).toContain("decode");
    expect(html.toLowerCase()).not.toContain("leaderboard");
    expect(html).toMatch(
      /not guaranteed to preserve every pixel|not lossless|blur fine detail/i,
    );
  });
});
