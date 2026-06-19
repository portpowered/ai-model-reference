import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPaperPage } from "@/lib/content/paper-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("GPT-2 report paper page", () => {
  test("is published as a canonical paper route", async () => {
    const page = await loadPaperPage("gpt-2-report");

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.kind).toBe("paper");
    expect(page.frontmatter.registryId).toBe("paper.gpt-2-report");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("paper.gpt-2-report")).toBe(true);
    expect(page.messages.title).toBe("GPT-2 Report");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "language models are unsupervised multitask learners",
    );
    expect(page.toc.some((item) => item.url === "#why-it-matters")).toBe(true);
    expect(
      page.toc.some((item) => item.url === "#method-or-architecture"),
    ).toBe(true);
  });

  test("renders required paper sections, graph, and adjacent published links", async () => {
    const page = await loadPaperPage("gpt-2-report");

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
    expect(html).toContain("Decoder-only transformer");
    expect(html).toContain("Byte-level BPE tokenization");
    expect(html).toContain("Broad next-token pretraining");
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('href="/docs/glossary/scaling-law"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("on this page");
  });
});
