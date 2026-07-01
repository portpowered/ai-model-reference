/**
 * BERT paper page slice proof for narrative and rendered teaching surfaces.
 * Routine bundle invariants (frontmatter, messages, tags, citations, assets)
 * are covered by `make validate-data`; this file proves observable SSR section,
 * graph label, related-link, and narrative copy behavior.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPaperPage } from "@/lib/content/paper-page";

const PAPER_SLUG = "bert-pre-training-of-deep-bidirectional-transformers";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("BERT paper page", () => {
  test("explains masked pretraining and bidirectional encoder framing in narrative copy", async () => {
    const page = await loadPaperPage(PAPER_SLUG);
    const method = page.messages.sections?.methodOrArchitecture?.body ?? "";
    const whyItMatters = page.messages.sections?.whyItMatters?.body ?? "";

    expect(method.toLowerCase()).toContain("masked language modeling");
    expect(method).toMatch(/hidden tokens from both left and right context/i);
    expect(method).toContain("bidirectional attention");
    expect(method).toContain("transformer architecture");
    expect(method).toContain("WordPiece");
    expect(method).toContain("embeddings");
    expect(method.toLowerCase()).toContain("gelu");
    expect(method).toContain("encoder-only");
    expect(whyItMatters).toContain("encoder-only path");
    expect(whyItMatters.toLowerCase()).toContain("masked language modeling");
    expect(whyItMatters).toContain(
      "without cataloguing every BERT checkpoint variant",
    );
  });

  test("renders required paper sections, contribution graph labels, and adjacent published links", async () => {
    const page = await loadPaperPage(PAPER_SLUG);

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Why It Matters");
    expect(html).toContain("Method Or Architecture");
    expect(html).toContain("Evidence");
    expect(html).toContain("Limitations");
    expect(html).toContain("WordPiece inputs");
    expect(html).toContain("Transformer encoder stack");
    expect(html).toContain("Bidirectional attention");
    expect(html).toContain("Masked language modeling");
    expect(html).toContain("Encoder-only fine-tuning");
    expect(html).toContain(
      "The BERT paper combines WordPiece inputs, transformer encoder blocks with bidirectional attention, masked language modeling pretraining, and encoder-only fine-tuning for downstream understanding tasks.",
    );
    expect(html).toContain(
      "Pre-training of Deep Bidirectional Transformers for Language Understanding",
    );
    expect(html).toContain('href="/docs/modules/bidirectional-attention"');
    expect(html).toContain('href="/docs/modules/wordpiece"');
    expect(html).toContain('href="/docs/glossary/encoder"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/modules/gelu"');
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain("from both left and right context");
    expect(html).toContain("encoder-only path");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("on this page");
  });
});
