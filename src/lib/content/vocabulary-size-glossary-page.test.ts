import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  expectGlossaryPresentationConvergence,
  expectHtmlToContainProse,
} from "@/lib/content/glossary-test-helpers";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const pageDir = getDocsPageDir("glossary", "vocabulary-size");
const messagesPath = join(pageDir, "messages/en.json");

describe("vocabulary size glossary page", () => {
  test("messages explain tokenizer count tradeoffs without process language", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Vocabulary Size");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "token ids",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "larger vocabulary",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "longer token sequence",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "reserved tokens",
    );
    expect(messages.callouts).toBeUndefined();
  });

  test("registry record is published and related docs resolve to shipped targets", () => {
    const record = getConceptById("concept.vocabulary-size");
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.vocabulary-size")).toBe(
      true,
    );

    if (!record) {
      throw new Error("expected concept.vocabulary-size in registry");
    }

    const items = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(
      items.find((item) => item.registryId === "concept.token")?.href,
    ).toBe("/docs/glossary/token");
    expect(
      items.find((item) => item.registryId === "module.byte-level-tokenization")
        ?.href,
    ).toBe("/docs/modules/byte-level-tokenization");
    expect(
      items.find((item) => item.registryId === "concept.special-tokens")?.href,
    ).toBe("/docs/glossary/special-tokens");
    expect(
      items.find((item) => item.registryId === "concept.hidden-size")?.href,
    ).toBe("/docs/glossary/hidden-size");
    expect(items.find((item) => item.registryId === "model.gpt-3")?.href).toBe(
      "/docs/models/gpt-3",
    );
  });

  test("renders glossary sections, related docs, and tag pills", async () => {
    const page = await loadGlossaryPage("vocabulary-size");

    expect(page.frontmatter.registryId).toBe("concept.vocabulary-size");
    expect(page.messages.title).toBe("Vocabulary Size");

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
    expectHtmlToContainProse(html, "reserved control entries");
    expectHtmlToContainProse(
      html,
      "larger vocabulary can let common strings stay in fewer tokens",
    );
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('href="/docs/glossary/special-tokens"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('href="/docs/glossary/hidden-size"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });

  test("published route, registry record, messages, and search aliases stay aligned", async () => {
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "vocabulary-size",
    });
    const record = getConceptById(page.frontmatter.registryId);

    expect(record?.slug).toBe("vocabulary-size");
    expect(page.messages.title).toBe("Vocabulary Size");
    expect(page.messages.sections?.commonConfusions.body).toContain(
      "Reserved tokens",
    );
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);

    const results = await docsSearchApi.search("vocab size");
    expect(
      results.some((result) => result.url === "/docs/glossary/vocabulary-size"),
    ).toBe(true);
  });
});
