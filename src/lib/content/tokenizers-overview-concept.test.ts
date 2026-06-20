import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";

describe("tokenizers overview concept page", () => {
  test("loads published tokenizer overview content with folded summary and related docs", async () => {
    const page = await loadConceptPage("tokenizers-overview");

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.tokenizers-overview");
    expect(page.messages.title).toBe("Tokenizers overview");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "language model does not read raw text directly",
    );
    expect(page.messages.sections?.simpleExample.body).toContain(
      '"unbelievable pricing"',
    );
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
    expect(page.toc.some((item) => item.url === "#related")).toBe(true);

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
    expect(html).toContain(
      "Tokenization changes several reader-visible outcomes at once.",
    );
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Phase");
  });
});
