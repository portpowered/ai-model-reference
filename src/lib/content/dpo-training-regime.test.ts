import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { buildSearchDocuments } from "@/lib/search/build-documents";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("DPO training-regime page (dpo-training-regime-page-003)", () => {
  test("registry record publishes preference-optimization aliases and alignment curated related ids", () => {
    const record = getTrainingRegimeById("training-regime.dpo");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "DPO",
      "Direct Preference Optimization",
      "direct preference optimization",
      "preference optimization",
    ]);
    expect(record?.tags).toEqual(["alignment", "foundations"]);
    expect(record?.relatedIds).toEqual(["concept.alignment"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.dpo")).toBe(true);
  });

  test("curated related docs keep the DPO page attached to the published alignment lane", () => {
    const source = getTrainingRegimeById("training-regime.dpo");
    if (!source) {
      throw new Error("expected training-regime.dpo in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const alignment = items.find(
      (item) => item.registryId === "concept.alignment",
    );
    expect(alignment?.href).toBe("/docs/glossary/alignment");
    expect(alignment?.isPlanned).toBe(false);
  });

  test("page renders alignment and nearby-regime search handoffs without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("dpo");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("training-regime.dpo");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/alignment"');
    expect(html).toContain('href="/search?q=RLHF"');
    expect(html).toContain('href="/search?q=PPO"');
    expect(html).toContain('href="/search?q=GRPO"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents carry the DPO comparison alias and alignment related id", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/dpo",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "DPO",
        "Direct Preference Optimization",
        "preference optimization",
      ]),
    );
    expect(document?.relatedIds).toEqual(["concept.alignment"]);
    expect(document?.tags).toEqual(
      expect.arrayContaining(["alignment", "foundations"]),
    );
  });
});
