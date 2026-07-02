/**
 * Consolidated review-facing slice proof for the roofline model concept page.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable route,
 * rendering, search, and throughput-adjacent link behavior together.
 */
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
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  applyRelatedDocMessageOverrides,
  deriveCuratedRelatedItems,
} from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.roofline-model";
const PAGE_URL = "/docs/concepts/roofline-model";
const pageDir = getDocsPageDir("concepts", "roofline-model");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderRooflinePageHtml(): Promise<string> {
  const page = await loadConceptPage("roofline-model");
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("roofline model slice verification (roofline-model-concept-page-004)", () => {
  test("published route, registry record, bundled messages, and assets stay aligned", async () => {
    const record = getConceptById(REGISTRY_ID);
    const page = await loadLocalDocsPage({
      section: "concepts",
      slug: "roofline-model",
    });
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const bundledAssets = JSON.parse(readFileSync(assetsPath, "utf8"));

    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("roofline-model");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.description).toBe(bundledMessages.description);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(bundledMessages.links?.memoryBandwidth).toContain("Memory");
    expect(bundledMessages.links?.flops).toContain("Hidden size");
    expect(bundledMessages.links?.tokensPerSecond).toContain(
      "Inter-token latency",
    );
    expect(bundledMessages.relatedDocs?.["system.memory"]?.reason).toContain(
      "bytes",
    );
    expect(bundledAssets.rooflineChart?.type).toBe("chart");
  });

  test("app route metadata and English render resolve without missing-content placeholders", async () => {
    const metadata = await buildDocsPageMetadata([
      "concepts",
      "roofline-model",
    ]);
    expect(metadata.alternates).toEqual({
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
      },
    });
    expect(metadata.title).toContain("Roofline");

    const rendered = await renderDocsSlugPage(
      ["concepts", "roofline-model"],
      "en",
    );
    expect(rendered).toBeDefined();
  });

  test("rendered page exposes throughput-adjacent links, curated reasons, and search aliases", async () => {
    const html = await renderRooflinePageHtml();
    const record = getConceptById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected concept.roofline-model in registry");
    }

    const related = applyRelatedDocMessageOverrides(
      deriveCuratedRelatedItems(
        record,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ),
      pageMessagesSchema.parse(JSON.parse(readFileSync(messagesPath, "utf8"))),
    );

    expect(html).toContain("Throughput Connections");
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/docs/glossary/hidden-size"');
    expect(html).toContain('href="/docs/glossary/inter-token-latency"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain("memory-bandwidth slope");
    expect(html).toContain("compute-bound ceiling");
    expect(html).toContain("observed generation rate");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("bytes per parameter");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toMatch(/\{\{[^}]+\}\}/);
    expect(related.length).toBe(5);
    expect(
      related.find((item) => item.registryId === "system.memory")?.reasonLabel,
    ).toContain("sloped roofline");
    expect(
      related.find((item) => item.registryId === "concept.quantization")
        ?.reasonLabel,
    ).toContain("arithmetic intensity");

    for (const query of [
      "roofline",
      "memory bound",
      "compute bound",
      "arithmetic intensity",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === PAGE_URL)).toBe(true);
    }
  });
});
