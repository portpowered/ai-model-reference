import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { TOKEN_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { expectGlossaryPresentationConvergence } from "@/lib/content/glossary-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = TOKEN_GLOSSARY_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("token glossary page messages", () => {
  test("includes required localized fields for the concept template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Token");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItMatters.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.simpleExample.body?.length).toBeGreaterThan(0);
  });
});

describe("loadGlossaryPage token", () => {
  test("compiles MDX with local namespaces and Phase 1 presentation contract", async () => {
    const page = await loadGlossaryPage("token");

    expect(page.frontmatter.registryId).toBe("concept.token");
    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.title).toBe("Token");

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
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain('data-testid="citation-list"');
    expect(html).toContain("What It Is");
    expect(html).toContain("128k context");
    expect(html).toContain('data-page-asset="conceptMap"');
    expect(html).toContain('data-graph-id="graph.token-concept-map"');
    expect(html).toContain(
      "Diagram showing text flowing through a tokenizer into token IDs and embeddings",
    );
    expect(html).toContain(
      "How raw text becomes token IDs before the transformer stack",
    );
  });
});

describe("token glossary page assets", () => {
  test("resolves conceptMap graph asset with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.conceptMap.type).toBe("graph");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
