import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RESIDUAL_CONNECTION_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = RESIDUAL_CONNECTION_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 residual connection glossary page (US-007)", () => {
  test("registry record is published with aliases and related ids", () => {
    const record = getConceptById("concept.residual-connection");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "residual stream",
      "residual add",
      "residual pathway",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.skip-connection",
      "concept.feed-forward-network",
      "concept.transformer-architecture",
      "concept.normalization",
      "module.attention",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.residual-connection")).toBe(
      true,
    );
  });

  test("curated related links skip connection, feed-forward network, transformer architecture, normalization, and attention", () => {
    const source = getConceptById("concept.residual-connection");
    if (!source) {
      throw new Error("expected concept.residual-connection in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const skipConnection = items.find(
      (item) => item.registryId === "concept.skip-connection",
    );
    expect(skipConnection?.href).toBe("/docs/glossary/skip-connection");
    expect(skipConnection?.isPlanned).toBe(false);

    const feedForwardNetwork = items.find(
      (item) => item.registryId === "concept.feed-forward-network",
    );
    expect(feedForwardNetwork?.href).toBe(
      "/docs/modules/feed-forward-network",
    );
    expect(feedForwardNetwork?.isPlanned).toBe(false);

    const architecture = items.find(
      (item) => item.registryId === "concept.transformer-architecture",
    );
    expect(architecture?.href).toBe("/docs/concepts/transformer-architecture");
    expect(architecture?.isPlanned).toBe(false);

    const normalization = items.find(
      (item) => item.registryId === "concept.normalization",
    );
    expect(normalization?.href).toBe("/docs/glossary/normalization");
    expect(normalization?.isPlanned).toBe(false);

    const attention = items.find(
      (item) => item.registryId === "module.attention",
    );
    expect(attention?.href).toBe("/docs/modules/attention");
    expect(attention?.isPlanned).toBe(false);
  });

  test("messages explain gradient highway, residual-vs-skip scope, and pre-norm vs post-norm placement", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Residual connection");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "residual add",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "gradient",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "pre-norm",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "post-norm",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "narrower than skip connection",
    );
  });

  test("page renders residual explanation and related family links", async () => {
    const page = await loadGlossaryPage("residual-connection");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.residual-connection");

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
    expectHtmlToContainProse(html, "residual add");
    expectHtmlToContainProse(html, "pre-norm");
    expect(html).toContain('href="/docs/glossary/skip-connection"');
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/glossary/normalization"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records residual connection with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/residual-connection",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
  });
});
