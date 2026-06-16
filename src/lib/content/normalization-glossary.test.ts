import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { NORMALIZATION_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = NORMALIZATION_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 normalization glossary page (US-004)", () => {
  test("registry record is published with explainsIds and curated related ids", () => {
    const record = getConceptById("concept.normalization");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(["normalization layer", "norm layer"]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.explainsIds).toEqual([
      "concept.layer-norm",
      "concept.rmsnorm",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "concept.residual-connection",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.normalization")).toBe(true);
  });

  test("curated related links transformer architecture and residual connection", () => {
    const source = getConceptById("concept.normalization");
    if (!source) {
      throw new Error("expected concept.normalization in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const architecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(architecture?.href).toBe("/docs/concepts/transformer-architecture");
    expect(architecture?.isPlanned).toBe(false);

    const residual = items.find(
      (item) => item.registryId === "concept.residual-connection",
    );
    expect(residual?.href).toBe("/docs/glossary/residual-connection");
    expect(residual?.isPlanned).toBe(false);
  });

  test("messages explain stabilization and layer-style norms over batch norm", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Normalization");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "rescale",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "batch norm",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "layer norm",
    );
  });

  test("page renders overview sections and transformer architecture related link", async () => {
    const page = await loadGlossaryPage("normalization");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.normalization");

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
    expect(html).toContain("Why It Matters");
    expectHtmlToContainProse(html, "layer norm");
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records normalization with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/normalization",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
  });
});
