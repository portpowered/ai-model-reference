import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RMSNORM_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = RMSNORM_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 RMSNorm module page (US-006)", () => {
  test("registry record is published with aliases and related ids", () => {
    const record = getConceptById("concept.rmsnorm");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "RMS Norm",
      "root mean square normalization",
      "RMSNorm",
    ]);
    expect(record?.tags).toEqual(["normalization", "foundations"]);
    expect(record?.prerequisiteIds).toEqual(["concept.normalization"]);
    expect(record?.relatedIds).toEqual([
      "concept.layer-norm",
      "concept.normalization",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.rmsnorm")).toBe(true);
  });

  test("curated related links layer norm and normalization overview", () => {
    const source = getConceptById("concept.rmsnorm");
    if (!source) {
      throw new Error("expected concept.rmsnorm in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const layerNorm = items.find(
      (item) => item.registryId === "concept.layer-norm",
    );
    expect(layerNorm?.href).toBe("/docs/modules/layer-norm");
    expect(layerNorm?.isPlanned).toBe(false);

    const normalization = items.find(
      (item) => item.registryId === "concept.normalization",
    );
    expect(normalization?.href).toBe("/docs/glossary/normalization");
    expect(normalization?.isPlanned).toBe(false);
  });

  test("messages compare RMSNorm with LayerNorm using module-template math schemas", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("RMSNorm");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.math?.rmsNormSchema?.formula).toContain("x_i^2");
    expect(messages.math?.rmsNormSchema?.variableDefinitions?.gamma?.term).toBe(
      "\\gamma",
    );
    expect(messages.math?.layerNormSchema?.formula).toContain("\\mu");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "root mean square",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "does not subtract the feature mean",
    );
    expect(
      messages.sections?.mathOrComputeSchema.body?.toLowerCase(),
    ).toContain("layer norm");
    expect(
      messages.sections?.comparedToNearbyModules.body?.toLowerCase(),
    ).toContain("layer norm");
    expect(
      messages.sections?.comparedToNearbyModules.body?.toLowerCase(),
    ).toContain("mean centering");
  });

  test("page renders module-template sections, norm switcher, and formula comparison", async () => {
    const page = await loadModulePage("rmsnorm");

    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("module.rmsnorm");

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
    expect(html).toContain('data-registry-id="module.rmsnorm"');
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-graph-id="graph.rmsnorm-compute-flow"');
    expect(html).toContain('data-attention-schema-comparison="true"');
    expect(html).toContain('data-math-schema="layerNorm"');
    expect(html).toContain('data-math-schema="rmsNorm"');
    expect(html).toContain('data-math-variable-definition="gamma"');
    expect(html).toContain('data-page-asset="comparisonTable"');
    expect(html).toContain('data-table-id="table.rmsnorm-comparison"');
    expectHtmlToContainProse(html, "root mean square");
    expectHtmlToContainProse(
      html,
      "keeps the scale correction but drops mean centering",
    );
    expect(html).toContain('href="/docs/modules/layer-norm"');
    expect(html).toContain('href="/docs/glossary/normalization"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records RMSNorm with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/modules/rmsnorm",
    );
    expect(document?.kind).toBe("module");
    expect(document?.facets.kind).toBe("module");
  });
});
