import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { LAYER_NORM_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryPresentationConvergence,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
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

const pageDir = LAYER_NORM_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 layer norm glossary page (US-005)", () => {
  test("registry record is published with aliases and prerequisite ids", () => {
    const record = getConceptById("concept.layer-norm");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(["LayerNorm", "layer normalization", "LN"]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.prerequisiteIds).toEqual(["concept.normalization"]);
    expect(record?.relatedIds).toEqual([
      "concept.normalization",
      "concept.transformer-architecture",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.layer-norm")).toBe(true);
  });

  test("curated related links normalization overview and transformer architecture", () => {
    const source = getConceptById("concept.layer-norm");
    if (!source) {
      throw new Error("expected concept.layer-norm in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const normalization = items.find(
      (item) => item.registryId === "concept.normalization",
    );
    expect(normalization?.href).toBe("/docs/glossary/normalization");
    expect(normalization?.isPlanned).toBe(false);

    const architecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(architecture?.href).toBe("/docs/concepts/transformer-architecture");
    expect(architecture?.isPlanned).toBe(false);
  });

  test("messages include layer norm formula with symbol-only definitions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Layer norm");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.math?.layerNorm?.formula).toContain("\\mu");
    expect(messages.math?.layerNorm?.variableDefinitions?.x?.term).toBe("x");
    expect(messages.math?.layerNorm?.variableDefinitions?.mu?.term).toBe("μ");
    expect(
      messages.math?.layerNorm?.variableDefinitions?.gamma?.definition,
    ).toContain("scale");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "layer normalization",
    );
  });

  test("page renders narrative sections, math block, and related links", async () => {
    const page = await loadGlossaryPage("layer-norm");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.layer-norm");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryPresentationConvergence(html, {
      title: page.messages.title,
    });
    expect(html).toContain("What It Is");
    expect(html).toContain("Formula And Symbols");
    expect(html).toContain('data-page-math-formula="layerNorm"');
    expect(html).toContain('data-math-variable-definition="mu"');
    expectHtmlToContainProse(html, "mean");
    expect(html).toContain('href="/docs/glossary/normalization"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records layer norm with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/layer-norm",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
  });
});
