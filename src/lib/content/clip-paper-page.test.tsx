import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { resolveCitations } from "@/lib/content/citations";
import { loadPaperPage } from "@/lib/content/paper-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { getPaperById } from "@/lib/content/registry-runtime";

const paperSlug =
  "learning-transferable-visual-models-from-natural-language-supervision";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("CLIP paper page", () => {
  test("keeps the route, registry record, english messages, and citation linkage aligned", async () => {
    const page = await loadPaperPage(paperSlug);
    const record = getPaperById(
      "paper.learning-transferable-visual-models-from-natural-language-supervision",
    );
    if (!record) {
      throw new Error(
        "expected paper.learning-transferable-visual-models-from-natural-language-supervision in registry",
      );
    }

    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe(
      "Learning Transferable Visual Models From Natural Language Supervision",
    );
    expect(page.messages.openingSummary).toContain(
      "Learning Transferable Visual Models From Natural Language Supervision",
    );
    expect(page.messages.openingSummary?.toLowerCase()).toContain("clip");

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      id: "citation.learning-transferable-visual-models-from-natural-language-supervision",
      title:
        "Learning Transferable Visual Models From Natural Language Supervision",
      year: 2021,
    });
  });

  test("is published as a canonical paper route", async () => {
    const page = await loadPaperPage(paperSlug);

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.kind).toBe("paper");
    expect(page.frontmatter.registryId).toBe(
      "paper.learning-transferable-visual-models-from-natural-language-supervision",
    );
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has(
        "paper.learning-transferable-visual-models-from-natural-language-supervision",
      ),
    ).toBe(true);
    expect(page.toc.some((item) => item.url === "#why-it-matters")).toBe(true);
    expect(
      page.toc.some((item) => item.url === "#method-or-architecture"),
    ).toBe(true);
  });

  test("renders required paper sections, graph labels, and adjacent published links", async () => {
    const page = await loadPaperPage(paperSlug);

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
    expect(html.toLowerCase()).toContain("contrastive");
    expect(html).toContain("Shared embedding space");
    expect(html).toContain('href="/docs/glossary/multimodal-model"');
    expect(html).toContain('href="/docs/modules/clip-image-tokenization"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("on this page");
  });
});
