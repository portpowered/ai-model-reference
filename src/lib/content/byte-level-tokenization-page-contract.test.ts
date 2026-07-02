import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { BYTE_LEVEL_TOKENIZATION_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { getRegistryRecordById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { docsSearchApi } from "@/lib/search/search-server";

const messagesPath = join(BYTE_LEVEL_TOKENIZATION_PAGE_DIR, "messages/en.json");

describe("byte-level tokenization focused page contract (byte-level-tokenization-page-005)", () => {
  test("published route resolves with module.byte-level-tokenization registry binding", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find(
      (entry) => entry.url === "/docs/modules/byte-level-tokenization",
    );

    expect(page).toBeDefined();
    expect(page?.frontmatter.registryId).toBe("module.byte-level-tokenization");

    const record = getRegistryRecordById("module.byte-level-tokenization");
    expect(record?.kind).toBe("module");
    if (record?.kind !== "module") {
      throw new Error(
        "expected module.byte-level-tokenization in registry runtime",
      );
    }

    expect(record.slug).toBe("byte-level-tokenization");
    expect(record.status).toBe("published");
  });

  test("English messages provide title, description, opening summary, and section content", async () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Byte-Level Tokenization");
    expect(messages.description?.length).toBeGreaterThan(0);
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(
      messages.sections?.limitationsAndTradeoffs.body?.length,
    ).toBeGreaterThan(0);

    const page = await loadModulePage("byte-level-tokenization");
    expect(page.messages.title).toBe(messages.title);
    expect(page.messages.description).toBe(messages.description);
    expect(page.messages.openingSummary).toBe(messages.openingSummary);
  });

  test("search and vocabulary-size related-doc surfaces expose byte-level tokenization", async () => {
    const results = await docsSearchApi.search("byte-level tokenization");
    expect(results[0]?.url).toBe("/docs/modules/byte-level-tokenization");

    const vocabularyPage = await loadGlossaryPage("vocabulary-size");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: vocabularyPage.messages,
        assets: vocabularyPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: vocabularyPage.content,
      }),
    );
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });
});
