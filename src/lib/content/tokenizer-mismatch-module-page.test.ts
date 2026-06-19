import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { TOKENIZER_MISMATCH_PAGE_DIR } from "@/lib/content/content-paths";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = TOKENIZER_MISMATCH_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("tokenizer-mismatch page messages", () => {
  test("includes the required localized fields for the canonical module page", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Tokenizer mismatch");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
  });
});

describe("loadModulePage tokenizer-mismatch", () => {
  test("published docs inventory resolves the canonical route, registry id, and English messages together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find(
      (entry) => entry.url === "/docs/modules/tokenizer-mismatch",
    );

    expect(page).toBeDefined();
    expect(page?.frontmatter.registryId).toBe("module.tokenizer-mismatch");
    expect(page?.messages.title).toBe("Tokenizer mismatch");
    expect(page?.messages.openingSummary?.length).toBeGreaterThan(0);
  });

  test("compiles MDX with local namespaces and renders tokenizer compatibility content", async () => {
    const page = await loadModulePage("tokenizer-mismatch");

    expect(page.frontmatter.registryId).toBe("module.tokenizer-mismatch");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Tokenizer mismatch");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("broad compatibility problem");
    expect(html).toContain("reader intends one text sequence");
    expect(html).toContain("prompt wrapper before inference");
    expect(html).toContain("chat-template wrappers");
    expect(html).toContain(
      'data-graph-id="graph.tokenizer-mismatch-compute-flow"',
    );
    expect(html).toContain('data-math-schema="tokenizerMismatch"');
    expect(html).toContain('href="/docs/modules/bpe"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

describe("tokenizer-mismatch page assets", () => {
  test("parses graph and table assets for the canonical module page", () => {
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("graph");
    if (assets.computeFlow.type === "graph") {
      expect(assets.computeFlow.graphId).toBe(
        "graph.tokenizer-mismatch-compute-flow",
      );
    }
    expect(assets.comparisonTable.type).toBe("table");
  });
});
