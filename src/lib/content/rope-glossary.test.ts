import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { ROPE_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
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

const pageDir = ROPE_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 RoPE glossary page (US-009)", () => {
  test("registry record is published with aliases, prerequisite ids, and citation", () => {
    const record = getConceptById("concept.rope");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "RoPE",
      "rotary position embedding",
      "rotary positional embedding",
      "rotary position encoding",
    ]);
    expect(record?.tags).toEqual(["position-encoding", "foundations"]);
    expect(record?.prerequisiteIds).toEqual(["concept.positional-encodings"]);
    expect(record?.relatedIds).toEqual([
      "concept.positional-encodings",
      "concept.relative-position-bias",
      "concept.alibi",
      "concept.context-extension",
      "concept.ntk-aware-rope-scaling",
      "concept.longrope",
    ]);
    expect(record?.citationIds).toEqual(["citation.su-roformer-rope"]);
    expect(record?.explainsIds).toEqual([
      "concept.superhot-rope",
      "concept.ntk-aware-rope-scaling",
      "concept.yarn",
      "concept.longrope",
      "concept.positional-interpolation",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.rope")).toBe(true);
  });

  test("curated related links bridge the position family and RoPE extension pages", () => {
    const source = getConceptById("concept.rope");
    if (!source) {
      throw new Error("expected concept.rope in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const positionalEncodings = items.find(
      (item) => item.registryId === "concept.positional-encodings",
    );
    expect(positionalEncodings?.href).toBe(
      "/docs/concepts/positional-encodings",
    );
    expect(positionalEncodings?.isPlanned).toBe(false);

    const relativeBias = items.find(
      (item) => item.registryId === "concept.relative-position-bias",
    );
    expect(relativeBias?.href).toBe("/docs/modules/relative-position-bias");
    expect(relativeBias?.isPlanned).toBe(false);

    const contextExtension = items.find(
      (item) => item.registryId === "concept.context-extension",
    );
    expect(contextExtension?.href).toBe("/docs/concepts/context-extension");
    expect(contextExtension?.isPlanned).toBe(false);

    const alibi = items.find((item) => item.registryId === "concept.alibi");
    expect(alibi?.href).toBe("/docs/concepts/alibi");
    expect(alibi?.isPlanned).toBe(false);

    const ntkAware = items.find(
      (item) => item.registryId === "concept.ntk-aware-rope-scaling",
    );
    expect(ntkAware?.href).toBe("/docs/modules/ntk-aware-rope-scaling");
    expect(ntkAware?.isPlanned).toBe(false);

    const longrope = items.find(
      (item) => item.registryId === "concept.longrope",
    );
    expect(longrope?.href).toBe("/docs/modules/longrope");
    expect(longrope?.isPlanned).toBe(false);
  });

  test("messages explain rotary query/key rotation and relative distance", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("RoPE");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "rotary position embedding",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("query");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("key");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "separation",
    );
    expect(messages.sections?.whyItMatters.body).toContain("Llama");
  });

  test("page renders summary, references section, and related links", async () => {
    const page = await loadModulePage("rope");

    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("module.rope");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expectGlossaryOmitsOpeningSummary(html);
    expectGlossarySingleTagPillList(html);
    expect(html).toContain("What It Is");
    expectHtmlToContainProse(html, "Rotary position embedding");
    expect(html).toContain("References");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Su, Jianlin, et al.");
    expect(html).toContain("https://arxiv.org/abs/2104.09864");
    expect(html).toContain('href="/docs/concepts/positional-encodings"');
    expect(html).toContain('href="/docs/modules/relative-position-bias"');
    expect(html).toContain('href="/docs/modules/alibi"');
    expect(html).toContain('href="/docs/concepts/context-extension"');
    expect(html).toContain('href="/docs/modules/ntk-aware-rope-scaling"');
    expect(html).toContain('href="/docs/modules/longrope"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records RoPE with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/modules/rope",
    );
    expect(document?.kind).toBe("module");
    expect(document?.facets.kind).toBe("module");
  });
});
