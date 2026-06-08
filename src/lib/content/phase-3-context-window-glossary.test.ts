import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { CONTEXT_WINDOW_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryBodyOmitsTitleHeading,
  expectGlossaryOmitsOpeningSummary,
  expectGlossarySingleTagPillList,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveCuratedRelatedItems,
  PLANNED_RELATED_REASON_LABEL,
} from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const pageDir = CONTEXT_WINDOW_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");

describe("Phase 3 context window glossary page (US-011)", () => {
  test("registry record is published with aliases and related ids", () => {
    const record = getConceptById("concept.context-window");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "context length",
      "sequence length limit",
      "max context",
    ]);
    expect(record?.tags).toEqual(["foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.context-extension",
      "concept.why-long-context-is-hard",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.context-window")).toBe(
      true,
    );
  });

  test("curated related links context extension and hardness pages as planned", () => {
    const source = getConceptById("concept.context-window");
    if (!source) {
      throw new Error("expected concept.context-window in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const contextExtension = items.find(
      (item) => item.registryId === "concept.context-extension",
    );
    expect(contextExtension?.isPlanned).toBe(true);
    expect(contextExtension?.href).toBeUndefined();
    expect(contextExtension?.reasonLabel).toBe(PLANNED_RELATED_REASON_LABEL);

    const whyHard = items.find(
      (item) => item.registryId === "concept.why-long-context-is-hard",
    );
    expect(whyHard?.isPlanned).toBe(true);
    expect(whyHard?.href).toBeUndefined();
    expect(whyHard?.reasonLabel).toBe(PLANNED_RELATED_REASON_LABEL);
  });

  test("messages distinguish context window, training length, and generation budget", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Context window");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "context window",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain("token");
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "training length",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "generation budget",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "output token",
    );
  });

  test("page renders definition, forward related rows, and tag pills", async () => {
    const page = await loadGlossaryPage("context-window");

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.context-window");

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
    expectHtmlToContainProse(html, "context window");
    expect(html).toContain("context extension");
    expect(html).toContain("why long context is hard");
    expect(html).toContain(PLANNED_RELATED_REASON_LABEL);
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index records context window with glossary kind", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/context-window",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
  });
});
