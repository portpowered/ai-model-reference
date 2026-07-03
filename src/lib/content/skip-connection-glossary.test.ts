import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { SKIP_CONNECTION_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = SKIP_CONNECTION_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 skip connection glossary page (US-011)", () => {
  test("registry record is published with aliases and related ids", () => {
    const record = getConceptById("concept.skip-connection");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "skip path",
      "shortcut connection",
      "residual shortcut",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.residual-connection",
      "concept.normalization",
      "concept.feed-forward-network",
      "concept.transformer-architecture",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.skip-connection")).toBe(
      true,
    );
  });

  test("curated related links residual connection, normalization, feed-forward network, and transformer architecture", () => {
    const source = getConceptById("concept.skip-connection");
    if (!source) {
      throw new Error("expected concept.skip-connection in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.residual-connection")
        ?.href,
    ).toBe("/docs/glossary/residual-connection");
    expect(
      items.find((item) => item.registryId === "concept.normalization")?.href,
    ).toBe("/docs/concepts/normalization");
    expect(
      items.find((item) => item.registryId === "concept.feed-forward-network")
        ?.href,
    ).toBe("/docs/concepts/feed-forward-network");
    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
  });

  test("messages explain the broader family and its residual overlap", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Skip connection");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "residual connections",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "broader family",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "exact synonyms",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "normalization",
    );
  });

  test("page renders skip-path explanation and related family links", async () => {
    const page = await loadGlossaryPage("skip-connection");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.skip-connection");

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
    expectHtmlToContainProse(html, "Residual connections");
    expect(html).toContain('href="/docs/glossary/residual-connection"');
    expect(html).toContain('href="/docs/concepts/normalization"');
    expect(html).toContain('href="/docs/concepts/feed-forward-network"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records skip connection with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/skip-connection",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["skip path", "shortcut connection"]),
    );
  });
});
