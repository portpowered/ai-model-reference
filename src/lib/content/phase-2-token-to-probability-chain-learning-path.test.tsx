import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import {
  CURATED_RELATED,
  DERIVED_RELATED_DOC_GROUP_LABELS,
} from "@/lib/content/related-docs";

async function renderGlossaryPageHtml(slug: string): Promise<string> {
  const page = await loadGlossaryPage(slug);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("Phase 2 token-to-probability learning-path navigation (US-012)", () => {
  test("token page surfaces registry-derived related doc link to embedding", async () => {
    const html = await renderGlossaryPageHtml("token");

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain(
      "Each token ID becomes a learned numerical representation before the model mixes context.",
    );
    expect(html).toContain('href="/docs/glossary/embedding"');
  });

  test("embedding page surfaces forward link toward logit via tensor", async () => {
    const html = await renderGlossaryPageHtml("embedding");

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
    expect(html).toContain('href="/docs/glossary/tensor"');
  });

  test("logit page surfaces registry-derived related doc link to softmax", async () => {
    const html = await renderGlossaryPageHtml("logit");

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
    expect(html).toContain('href="/docs/glossary/softmax"');
  });
});
