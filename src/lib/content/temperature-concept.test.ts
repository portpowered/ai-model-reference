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

const pageDir = getDocsPageDir("concepts", "temperature");
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/temperature";

describe("temperature concept discovery", () => {
  test("registry record stays published with sampling aliases, chain tags, and focused related ids", () => {
    const record = getConceptById("concept.temperature");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual([
      "sampling temperature",
      "softmax temperature",
    ]);
    expect(record?.tags).toEqual(["token-to-probability-chain", "foundations"]);
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.inference",
    );
    expect(record?.prerequisiteIds).toEqual(["concept.softmax"]);
    expect(record?.relatedIds).toEqual([
      "concept.softmax",
      "concept.entropy",
      "concept.sampling-overview",
      "concept.greedy-decoding",
      "concept.top-k-sampling",
      "concept.top-p-sampling",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.temperature")).toBe(true);
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.temperature"),
    ).toBe(true);
  });

  test("curated related links point to softmax and sampling neighbors", () => {
    const source = getConceptById("concept.temperature");
    if (!source) {
      throw new Error("expected concept.temperature in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const hrefById = Object.fromEntries(
      items.map((item) => [item.registryId, item.href]),
    );

    expect(hrefById["concept.softmax"]).toBe("/docs/glossary/softmax");
    expect(hrefById["concept.entropy"]).toBe("/docs/glossary/entropy");
    expect(hrefById["concept.sampling-overview"]).toBe(
      "/docs/glossary/sampling-overview",
    );
    expect(hrefById["concept.greedy-decoding"]).toBe(
      "/docs/glossary/greedy-decoding",
    );
    expect(hrefById["concept.top-k-sampling"]).toBe(
      "/docs/glossary/top-k-sampling",
    );
    expect(hrefById["concept.top-p-sampling"]).toBe(
      "/docs/glossary/top-p-sampling",
    );
  });

  test("search index records temperature with aliases and chain tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["sampling temperature", "softmax temperature"]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["token-to-probability-chain", "foundations"]),
    );
    expect(document?.registryId).toBe("concept.temperature");
  });

  test("search ranks temperature concept first for Temperature title query", async () => {
    const results = await docsSearchApi.search("Temperature");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(CONCEPT_URL);
  });

  test("page bundle resolves from getDocsPageDir", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.pageDir === pageDir);

    expect(page?.url).toBe(CONCEPT_URL);
    expect(page?.frontmatter.registryId).toBe("concept.temperature");
  });
});

describe("temperature concept page", () => {
  test("messages teach logit rescaling before softmax without changing weights", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Temperature");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "softmax(z / t)",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "does not change model weights",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "probabilities move closer together",
    );
    expect(messages.sections?.whereItAppears.body?.toLowerCase()).toContain(
      "during decoding",
    );
  });

  test("messages teach lower and higher temperature behavior with decoding limits", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.sections?.lowerTemperature.body?.toLowerCase()).toContain(
      "sharper",
    );
    expect(messages.sections?.lowerTemperature.body?.toLowerCase()).toContain(
      "similar wording",
    );
    expect(messages.sections?.lowerTemperature.body?.toLowerCase()).toContain(
      "temperature 0",
    );
    expect(messages.sections?.lowerTemperature.body?.toLowerCase()).toContain(
      "argmax",
    );
    expect(messages.sections?.higherTemperature.body?.toLowerCase()).toContain(
      "vary more",
    );
    expect(messages.sections?.higherTemperature.body?.toLowerCase()).toContain(
      "incoherent",
    );
    expect(messages.sections?.tradeoffs.body?.toLowerCase()).toContain(
      "trained weights",
    );
    expect(messages.sections?.tradeoffs.body?.toLowerCase()).toContain(
      "stored knowledge",
    );
    expect(messages.sections?.tradeoffs.body?.toLowerCase()).toContain(
      "appearance of confidence",
    );
    expect(messages.sections?.tradeoffs.body?.toLowerCase()).toContain(
      "calibration",
    );
  });

  test("messages teach sampling neighbor roles and decoding interaction order", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const body = messages.sections?.samplingNeighbors.body?.toLowerCase() ?? "";
    expect(body).toContain("softmax");
    expect(body).toContain("entropy");
    expect(body).toContain("greedy decoding");
    expect(body).toContain("top-k");
    expect(body).toContain("top-p");
    expect(body).toContain("reshapes scores first");
    expect(body).toContain("truncation");
    expect(
      messages.relatedDocs?.["concept.softmax"]?.reason?.length,
    ).toBeGreaterThan(0);
    expect(
      messages.relatedDocs?.["concept.entropy"]?.reason?.length,
    ).toBeGreaterThan(0);
    expect(
      messages.relatedDocs?.["concept.top-k-sampling"]?.reason?.length,
    ).toBeGreaterThan(0);
    expect(
      messages.relatedDocs?.["concept.top-p-sampling"]?.reason?.length,
    ).toBeGreaterThan(0);
  });

  test("page renders title, sections, opening summary, and related links", async () => {
    const page = await loadConceptPage("temperature");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.temperature");
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
    expect(html).toContain("Lower Temperature");
    expect(html).toContain("Higher Temperature");
    expect(html).toContain("Tradeoffs And Limits");
    expect(html).toContain("Sampling Neighbors");
    expect(html).toContain("softmax(z / T)");
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain('href="/docs/glossary/entropy"');
    expect(html).toContain('href="/docs/glossary/sampling-overview"');
    expect(html).toContain('href="/docs/glossary/greedy-decoding"');
    expect(html).toContain('href="/docs/glossary/top-k-sampling"');
    expect(html).toContain('href="/docs/glossary/top-p-sampling"');
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});
