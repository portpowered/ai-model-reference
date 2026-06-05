import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { getConceptById } from "@/lib/content/registry-runtime";
import {
  CURATED_RELATED,
  DERIVED_RELATED_DOC_GROUP_LABELS,
} from "@/lib/content/related-docs";

describe("Phase 2 token page learning chain entry (US-010)", () => {
  test("token registry includes chain tag and forward relatedIds to embedding", () => {
    const token = getConceptById("concept.token");
    expect(token?.tags).toContain("token-to-probability-chain");
    expect(token?.tags).toContain("foundations");
    expect(token?.relatedIds).toContain("concept.embedding");
  });

  test("token message copy mentions embeddings and next-token scoring", async () => {
    const page = await loadGlossaryPage("token");
    const copy = JSON.stringify(page.messages).toLowerCase();

    expect(copy).toContain("embed");
    expect(copy).toMatch(/next.token/);
    expect(copy).toContain("logit");
    expect(copy).toContain("softmax");
  });

  test("token page frontmatter includes the shared chain tag", async () => {
    const page = await loadGlossaryPage("token");
    expect(page.frontmatter.tags).toContain("token-to-probability-chain");
    expect(page.frontmatter.tags).toContain("foundations");
  });

  test("token page related section links to embedding with a visible reason label", async () => {
    const page = await loadGlossaryPage("token");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("embeddings");
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
    expect(html).toContain('href="/tags/token-to-probability-chain"');
    expect(html).toContain("Token To Probability Chain");
  });
});
