import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { loadPaperPage } from "@/lib/content/paper-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { getPaperById } from "@/lib/content/registry-runtime";

const PAPER_SLUG = "bert-pre-training-of-deep-bidirectional-transformers";
const PAPER_REGISTRY_ID =
  "paper.bert-pre-training-of-deep-bidirectional-transformers";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("BERT paper page", () => {
  test("keeps the route, registry record, english messages, and citation linkage aligned", async () => {
    const page = await loadPaperPage(PAPER_SLUG);
    const record = getPaperById(PAPER_REGISTRY_ID);
    if (!record) {
      throw new Error(`expected ${PAPER_REGISTRY_ID} in registry`);
    }

    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("BERT Paper");
    expect(page.messages.openingSummary).toContain(
      "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      id: "citation.bert-pre-training-of-deep-bidirectional-transformers",
      title:
        "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
      year: 2018,
    });
  });

  test("is published as a canonical paper route", async () => {
    const page = await loadPaperPage(PAPER_SLUG);

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.kind).toBe("paper");
    expect(page.frontmatter.registryId).toBe(PAPER_REGISTRY_ID);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(PAPER_REGISTRY_ID)).toBe(true);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "pre-training of deep bidirectional transformers for language understanding",
    );
    expect(page.toc.some((item) => item.url === "#why-it-matters")).toBe(true);
    expect(
      page.toc.some((item) => item.url === "#method-or-architecture"),
    ).toBe(true);
  });

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

  test("renders required paper sections and adjacent published links", async () => {
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
