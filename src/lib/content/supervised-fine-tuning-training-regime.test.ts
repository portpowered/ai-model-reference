import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("supervised fine-tuning training-regime identity contracts", () => {
  test("registry record publishes SFT aliases, related ids, and reused instruction-following citation", () => {
    const record = getTrainingRegimeById(
      "training-regime.supervised-fine-tuning",
    );
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "SFT",
      "supervised fine tuning",
      "supervised fine-tuning",
    ]);
    expect(record?.tags).toEqual(["alignment", "foundations"]);
    expect(record?.relatedIds).toEqual([
      "training-regime.pretraining",
      "training-regime.dpo",
      "concept.alignment",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.training-language-models-to-follow-instructions-with-human-feedback",
    ]);
    expect(record?.regimeType).toBe("post-training");
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.supervised-fine-tuning"),
    ).toBe(true);

    const citation = getCitationById(
      "citation.training-language-models-to-follow-instructions-with-human-feedback",
    );
    expect(citation?.title).toContain(
      "follow instructions with human feedback",
    );
  });

  test("search documents and runtime search resolve SFT aliases to the canonical page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/supervised-fine-tuning",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "SFT",
        "supervised fine tuning",
        "supervised fine-tuning",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "training-regime.pretraining",
      "training-regime.dpo",
      "concept.alignment",
    ]);

    for (const query of [
      "SFT",
      "supervised fine tuning",
      "supervised fine-tuning",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(
        "/docs/training/supervised-fine-tuning",
      );
    }
  });

  test("curated related docs route readers to pretraining, DPO, and alignment from the registry record", () => {
    const source = getTrainingRegimeById(
      "training-regime.supervised-fine-tuning",
    );
    if (!source) {
      throw new Error(
        "expected training-regime.supervised-fine-tuning in registry",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "training-regime.pretraining")
        ?.href,
    ).toBe("/docs/training/pretraining");
    expect(
      items.find((item) => item.registryId === "training-regime.dpo")?.href,
    ).toBe("/docs/training/dpo");
    expect(
      items.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/concepts/alignment");
  });

  test("page renders math symbol definitions and update-mechanism prose without page-meta framing", async () => {
    const page = await loadTrainingRegimePage("supervised-fine-tuning");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('role="math"');
    expect(html).toContain(
      'data-page-math-variable-definitions="supervisedImitationObjective"',
    );
    expect(html).toContain('data-math-variable-definition="theta"');
    expect(html).toContain('data-math-variable-definition="xi"');
    expect(html).toContain('data-math-variable-definition="yi"');
    expect(html).toContain(">training example index<");
    expect(html).toContain("does not require one specific adapter method");
    expect(html).toContain("Depending on which examples dominate the dataset");
    expect(html).not.toContain("This page does not prescribe");
    expect(html).not.toContain("pattern.The");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/docs/concepts/alignment"');
  });
});
