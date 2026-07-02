import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { ALIBI_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
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

const pageDir = ALIBI_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 ALiBi glossary page (US-010)", () => {
  test("registry record is published with aliases, prerequisite ids, and citation", () => {
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
      "concept.nope",
    ]);
    expect(record?.citationIds).toEqual(["citation.press-alibi"]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.alibi")).toBe(true);
  });

  test("curated related links positional encodings, relative bias, RoPE, and NoPE with navigable hrefs", () => {
    const source = getConceptById("concept.alibi");
    if (!source) {
      throw new Error("expected concept.alibi in registry");
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
    expect(relativeBias?.href).toBe("/docs/concepts/relative-position-bias");
    expect(relativeBias?.isPlanned).toBe(false);

    const rope = items.find((item) => item.registryId === "concept.rope");
    expect(rope?.href).toBe("/docs/modules/rope");
    expect(rope?.isPlanned).toBe(false);

    const contextWindow = items.find(
      (item) => item.registryId === "concept.context-window",
    );
    expect(contextWindow?.href).toBe("/docs/glossary/context-window");
    expect(contextWindow?.isPlanned).toBe(false);

    const nope = items.find((item) => item.registryId === "concept.nope");
    expect(nope?.href).toBe("/docs/modules/nope");
    expect(nope?.isPlanned).toBe(false);
  });

  test("messages explain distance-based attention biases and contrast with RoPE", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("ALiBi");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("bias");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "distance",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("logit");
    expect(messages.sections?.commonConfusions.body).toContain("RoPE");
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "extrapol",
    );
  });

  test("page renders summary, references section, and related links", async () => {
    const page = await loadModulePage("alibi");

    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("module.alibi");

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
    expectHtmlToContainProse(html, "Attention with linear biases");
    expect(html).toContain("References");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Press, Ofir, et al.");
    expect(html).toContain("https://arxiv.org/abs/2108.12409");
    expect(html).toContain('href="/docs/concepts/positional-encodings"');
    expect(html).toContain('href="/docs/modules/relative-position-bias"');
    expect(html).toContain('href="/docs/modules/rope"');
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/modules/nope"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records ALiBi with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/modules/alibi",
    );
    expect(document?.kind).toBe("module");
    expect(document?.facets.kind).toBe("module");
  });
});
