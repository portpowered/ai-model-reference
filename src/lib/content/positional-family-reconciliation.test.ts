import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { getConceptById } from "@/lib/content/registry-runtime";

describe("Phase 3 positional family reconciliation (phase-3-pages-007)", () => {
  test("registry aliases cover search-friendly acronym and expanded-name queries", () => {
    expect(getConceptById("concept.rope")?.aliases).toContain("RoPE");
    expect(getConceptById("concept.alibi")?.aliases).toContain("ALiBi");
    expect(getConceptById("concept.nope")?.aliases).toContain("NoPE");
    expect(getConceptById("concept.ntk-aware-rope-scaling")?.aliases).toContain(
      "NTK-aware RoPE",
    );
    expect(
      getConceptById("concept.t5-relative-position-bias")?.aliases,
    ).toContain("T5 relative position bias");
    expect(
      getConceptById("concept.positional-interpolation")?.aliases,
    ).toContain("positional interpolation");
  });

  test("RoPE and context-extension explain and link into the long-context family", () => {
    const rope = getConceptById("concept.rope");
    expect(rope?.relatedIds).toContain("concept.ntk-aware-rope-scaling");
    expect(rope?.relatedIds).toContain("concept.longrope");
    expect(rope?.explainsIds).toContain("concept.yarn");
    expect(rope?.explainsIds).toContain("concept.positional-interpolation");

    const contextExtension = getConceptById("concept.context-extension");
    expect(contextExtension?.relatedIds).toContain(
      "concept.positional-interpolation",
    );
    expect(contextExtension?.relatedIds).toContain("concept.longrope");
    expect(contextExtension?.explainsIds).toContain("concept.superhot-rope");
    expect(contextExtension?.explainsIds).toContain("concept.yarn");
  });

  test("rendered pages keep visible references and navigation across the family", async () => {
    const ropePage = await loadGlossaryPage("rope");
    const ropeHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: ropePage.messages,
        assets: ropePage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: ropePage.content,
      }),
    );

    expect(ropeHtml).toContain("References");
    expect(ropeHtml).toContain('data-testid="citation-list"');
    expect(ropeHtml).toContain('href="/docs/glossary/ntk-aware-rope-scaling"');
    expect(ropeHtml).toContain('href="/docs/glossary/longrope"');

    const contextExtensionPage = await loadConceptPage("context-extension");
    const contextExtensionHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: contextExtensionPage.messages,
        assets: contextExtensionPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: contextExtensionPage.content,
      }),
    );

    expect(contextExtensionHtml).toContain(
      'href="/docs/glossary/positional-interpolation"',
    );
    expect(contextExtensionHtml).toContain('href="/docs/glossary/longrope"');

    const positionalEncodingsPage = await loadConceptPage(
      "positional-encodings",
    );
    const positionalEncodingsHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: positionalEncodingsPage.messages,
        assets: positionalEncodingsPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: positionalEncodingsPage.content,
      }),
    );

    expect(positionalEncodingsHtml).toContain(
      'href="/docs/glossary/absolute-positional-embeddings"',
    );
    expect(positionalEncodingsHtml).toContain(
      'href="/docs/glossary/relative-position-bias"',
    );
  });
});
