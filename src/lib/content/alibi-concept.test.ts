import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { ALIBI_CONCEPT_PAGE_DIR } from "@/lib/content/content-paths";
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

const messagesPath = join(ALIBI_CONCEPT_PAGE_DIR, "messages/en.json");

describe("ALiBi concept page", () => {
  test("registry record stays published and now resolves to the concept route with module-level follow-up links", () => {
    const record = getConceptById("concept.alibi");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "ALiBi",
      "attention with linear biases",
      "attention linear bias",
      "linear attention bias",
    ]);
    expect(record?.tags).toEqual(["position-encoding", "foundations"]);
    expect(record?.prerequisiteIds).toEqual(["concept.positional-encodings"]);
    expect(record?.relatedIds).toEqual([
      "concept.positional-encodings",
      "concept.relative-position-bias",
      "concept.rope",
      "concept.context-window",
      "module.alibi",
      "concept.nope",
    ]);
    expect(record?.citationIds).toEqual(["citation.press-alibi"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.alibi")).toBe(true);
  });

  test("curated related links point readers to the concept hub, nearby positional pages, and the module page", () => {
    const source = getConceptById("concept.alibi");
    if (!source) {
      throw new Error("expected concept.alibi in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.positional-encodings")
        ?.href,
    ).toBe("/docs/concepts/positional-encodings");
    expect(
      items.find((item) => item.registryId === "concept.relative-position-bias")
        ?.href,
    ).toBe("/docs/modules/relative-position-bias");
    const rope = items.find((item) => item.registryId === "concept.rope");
    expect(rope?.href).toBe("/docs/concepts/rope");
    expect(rope?.isPlanned).toBe(false);

    const contextWindow = items.find(
      (item) => item.registryId === "concept.context-window",
    );
    expect(contextWindow?.href).toBe("/docs/glossary/context-window");
    expect(contextWindow?.isPlanned).toBe(false);

    expect(items.find((item) => item.registryId === "module.alibi")?.href).toBe(
      "/docs/modules/alibi",
    );

    const nope = items.find((item) => item.registryId === "concept.nope");
    expect(nope?.href).toBe("/docs/modules/nope");
    expect(nope?.isPlanned).toBe(false);
  });

  test("messages explain the full name, attention change, absolute-table avoidance, and RoPE tradeoff", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Attention with linear biases (ALiBi)");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body).toContain(
      "Attention with linear biases (ALiBi)",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "distance-based penalty",
    );
    expect(messages.sections?.whyItMatters.body).toContain(
      "learned absolute tables",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "long-context discussions",
    );
    expect(messages.sections?.commonConfusions.body).toContain(
      "rotary position embedding (RoPE)",
    );
  });

  test("page renders concept-route content, related links, and references", async () => {
    const page = await loadConceptPage("alibi");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.alibi");

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
    expect(html).toContain("How It Changes Attention");
    expect(html).toContain("Tradeoffs And Limits");
    expect(html).toContain('href="/docs/concepts/positional-encodings"');
    expect(html).toContain('href="/docs/modules/relative-position-bias"');
    expect(html).toContain('href="/docs/concepts/rope"');
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/modules/alibi"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records ALiBi on the concept route", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/concepts/alibi",
    );
    expect(document?.kind).toBe("concept");
    expect(document?.facets.kind).toBe("concept");
  });
});
