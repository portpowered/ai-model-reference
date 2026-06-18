import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RMSNORM_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import {
  expectGlossaryPresentationConvergence,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
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

describe("Phase 3 RMSNorm glossary page (US-006)", () => {
  test("registry record is published with aliases and related ids", () => {
    const record = getConceptById("concept.rmsnorm");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "RMS Norm",
      "root mean square normalization",
      "RMSNorm",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
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

  test("messages explain RMS scaling and layer-norm comparison in common confusions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("RMSNorm");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.math?.rmsNorm?.formula).toContain("x_i^2");
    expect(messages.math?.rmsNorm?.variableDefinitions?.gamma?.term).toBe("γ");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "root mean square",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "skips subtracting the mean",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "layer norm",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "mean",
    );
  });

  test("page renders narrative sections, math block, layer-norm comparison, and related links", async () => {
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

    expectGlossaryPresentationConvergence(html, {
      title: page.messages.title,
    });
    expect(html).toContain("What It Is");
    expect(html).toContain("Formula And Symbols");
    expect(html).toContain("Common Confusions");
    expect(html).toContain('data-page-math-formula="rmsNorm"');
    expect(html).toContain('data-math-variable-definition="gamma"');
    expectHtmlToContainProse(html, "root mean square");
    expectHtmlToContainProse(html, "layer norm");
    expect(html).toContain('href="/docs/modules/layer-norm"');
    expect(html).toContain('href="/docs/glossary/normalization"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
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
