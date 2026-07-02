import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { loadPaperPage } from "@/lib/content/paper-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { getPaperById } from "@/lib/content/registry-runtime";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("Attention Is All You Need paper page", () => {
  test("keeps the route, registry record, english messages, and citation linkage aligned", async () => {
    const page = await loadPaperPage("attention-is-all-you-need");
    const record = getPaperById("paper.attention-is-all-you-need");
    if (!record) {
      throw new Error("expected paper.attention-is-all-you-need in registry");
    }

    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Attention Is All You Need");
    expect(page.messages.openingSummary).toContain("self-attention");

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      id: "citation.attention-is-all-you-need",
      title: "Attention Is All You Need",
      year: 2017,
    });
  });

  test("is published as a canonical paper route", async () => {
    const page = await loadPaperPage("attention-is-all-you-need");

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.kind).toBe("paper");
    expect(page.frontmatter.registryId).toBe("paper.attention-is-all-you-need");
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("paper.attention-is-all-you-need"),
    ).toBe(true);
    expect(page.messages.title).toBe("Attention Is All You Need");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "transformer",
    );
    expect(page.toc.some((item) => item.url === "#why-it-matters")).toBe(true);
    expect(
      page.toc.some((item) => item.url === "#method-or-architecture"),
    ).toBe(true);
  });

  test("renders required paper sections, contribution graph, and adjacent published links", async () => {
    const page = await loadPaperPage("attention-is-all-you-need");

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
    expect(html).toContain("Attention-centered architecture");
    expect(html).toContain("Multi-head attention");
    expect(html).toContain("Positional encodings");
    expect(html).toContain("Encoder-decoder stack");
    expect(html).toContain("Feed-forward sublayers");
    expect(html).toContain("Residual/skip paths");
    expect(html).toContain('href="/docs/glossary/transformer"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain("1706.03762");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("on this page");
  });
});
