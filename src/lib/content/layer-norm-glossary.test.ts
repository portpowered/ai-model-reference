import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { LAYER_NORM_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { expectHtmlToContainProse } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
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
const LAYER_NORM_TIMEOUT_MS = 15_000;

describe("Phase 3 layer norm module page (US-005)", () => {
  test("registry record is published with aliases and prerequisite ids", () => {
    const record = getConceptById("concept.layer-norm");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(["LayerNorm", "layer normalization", "LN"]);
    expect(record?.tags).toEqual(["normalization", "foundations"]);
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

  test("messages compare LayerNorm with RMSNorm using module-template math schemas", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Layer norm");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.math?.layerNormSchema?.formula).toContain("\\mu");
    expect(messages.math?.layerNormSchema?.variableDefinitions?.x?.term).toBe(
      "x",
    );
    expect(messages.math?.layerNormSchema?.variableDefinitions?.mu?.term).toBe(
      "\\mu",
    );
    expect(
      messages.math?.layerNormSchema?.variableDefinitions?.gamma?.definition,
    ).toContain("scale");
    expect(messages.math?.rmsNormSchema?.formula).toContain(
      "\\mathrm{RMSNorm}",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "layer normalization",
    );
    expect(
      messages.sections?.mathOrComputeSchema.body?.toLowerCase(),
    ).toContain("rmsnorm");
  });

  test(
    "page renders module-template sections, norm switcher, and formula comparison",
    async () => {
      const page = await loadModulePage("layer-norm");

      expect(page.frontmatter.kind).toBe("module");
      expect(page.frontmatter.status).toBe("published");
      expect(page.frontmatter.registryId).toBe("module.layer-norm");

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expect(html).not.toContain(`<h1>${page.messages.title}</h1>`);
      expect(html).toContain("What It Is");
      expect(html).toContain("How It Works");
      expect(html).toContain("Math Or Compute Schema");
      expect(html).toContain("Compared To Nearby Modules");
      expect(html).toContain('data-registry-id="module.layer-norm"');
      expect(html).toContain('data-attention-variant-comparison="true"');
      expect(html).toContain('data-graph-id="graph.layer-norm-compute-flow"');
      expect(html).toContain('data-attention-schema-comparison="true"');
      expect(html).toContain('data-math-schema="layerNorm"');
      expect(html).toContain('data-math-schema="rmsNorm"');
      expect(html).toContain('data-math-variable-definition="mu"');
      expect(html).toContain('data-page-asset="comparisonTable"');
      expect(html).toContain('data-table-id="table.layer-norm-comparison"');
      expectHtmlToContainProse(html, "mean");
      expectHtmlToContainProse(
        html,
        "Layer norm subtracts the feature mean before scaling, while RMSNorm keeps only the scale correction.",
      );
      expect(html).toContain('href="/docs/glossary/normalization"');
      expect(html).toContain('href="/docs/concepts/transformer-architecture"');
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="tag-pill-list"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
      expect(html).not.toContain("Phase");
      expect(html).not.toContain("Reader Shortcut");
    },
    { timeout: LAYER_NORM_TIMEOUT_MS },
  );

  test(
    "search index records layer norm with glossary kind",
    async () => {
      const registry = await loadRegistry();
      const pages = await loadPublishedDocsPages("en");
      const documents = buildSearchDocuments(pages, registry);

      const document = documents.find(
        (entry) => entry.url === "/docs/modules/layer-norm",
      );
      expect(document?.kind).toBe("module");
      expect(document?.facets.kind).toBe("module");
    },
    { timeout: LAYER_NORM_TIMEOUT_MS },
  );
});
