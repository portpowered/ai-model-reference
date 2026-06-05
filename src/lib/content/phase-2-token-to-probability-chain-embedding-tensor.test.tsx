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

describe("Phase 2 embedding and tensor glossary pages (US-004)", () => {
  test("embedding registry lists token as prerequisite", () => {
    const embedding = getConceptById("concept.embedding");
    expect(embedding?.prerequisiteIds).toContain("concept.token");
    expect(embedding?.relatedIds).toContain("concept.tensor");
  });

  test("tensor registry connects to embedding and forward to logit", () => {
    const tensor = getConceptById("concept.tensor");
    expect(tensor?.prerequisiteIds).toContain("concept.embedding");
    expect(tensor?.relatedIds).toContain("concept.logit");
  });

  test("embedding page renders required sections and forward link to tensor", async () => {
    const page = await loadGlossaryPage("embedding");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Embedding");
    expect(html).toContain("What It Is");
    expect(html).toContain('href="/docs/glossary/tensor"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });

  test("tensor page renders required sections and forward link to logit", async () => {
    const page = await loadGlossaryPage("tensor");
    expect(page.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="glossary-opening"');
    expect(page.messages.openingSummary?.toLowerCase()).toContain("tensor");
    expect(html).toContain("What It Is");
    expect(html).toContain("logits");
    expect(html).toContain('href="/docs/glossary/logit"');
  });
});
