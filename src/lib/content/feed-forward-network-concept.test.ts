import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = getDocsPageDir("concepts", "feed-forward-network");
const messagesPath = join(pageDir, "messages/en.json");
const CONCEPT_URL = "/docs/concepts/feed-forward-network";

describe("feed-forward-network concept discovery", () => {
  test("registry record stays published with FFN aliases, feed-forward tags, and focused related ids", () => {
    const record = getConceptById("concept.feed-forward-network");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "FFN",
      "feedforward network",
      "MLP block",
    ]);
    expect(record?.tags).toEqual(["feed-forward", "foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "concept.standard-ffn",
      "concept.mixture-of-experts",
      "concept.activation",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.feed-forward-network"),
    ).toBe(true);
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(
        "concept.feed-forward-network",
      ),
    ).toBe(true);
  });

  test("curated related links transformer architecture, standard FFN, mixture of experts, and activation", () => {
    const source = getConceptById("concept.feed-forward-network");
    if (!source) {
      throw new Error("expected concept.feed-forward-network in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "concept.standard-ffn")?.href,
    ).toBe("/docs/modules/standard-ffn");
    expect(
      items.find((item) => item.registryId === "concept.mixture-of-experts")
        ?.href,
    ).toBe("/docs/concepts/mixture-of-experts");
    expect(
      items.find((item) => item.registryId === "concept.activation")?.href,
    ).toBe("/docs/concepts/activation");
  });

  test("search index records feed-forward network with aliases and feed-forward tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === CONCEPT_URL);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining(["FFN", "MLP block", "feedforward network"]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["feed-forward", "foundations"]),
    );
  });

  test("search finds feed-forward network by title and aliases", async () => {
    for (const query of ["Feed-Forward Network", "FFN", "MLP block"] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });
});

describe("feed-forward-network concept page", () => {
  test("messages provide title, description, opening summary, and concept sections", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Feed-Forward Network");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.description?.toLowerCase()).toContain("token-wise");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "position-wise",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "attention",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "self-attention",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "transformer",
    );
  });

  test("page renders concept template sections without missing message values", async () => {
    const page = await loadConceptPage("feed-forward-network");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.feed-forward-network");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Simple Example");
    expect(html).toContain("Common Confusions");
    expect(html).toContain("position-wise");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/concepts/mixture-of-experts"');
    expect(html).toContain('href="/docs/concepts/activation"');
    expect(html).toContain('href="/tags/feed-forward"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });
});
