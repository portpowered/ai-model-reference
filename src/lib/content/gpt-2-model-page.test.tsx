import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";

describe("gpt-2 model page", () => {
  test("derived related docs keep core GPT-2 learning paths visible without duplicate module links", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.gpt-2"
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain("Tokenizer overview");
    expect(html).toContain('data-planned="true"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(
      html.match(/href="\/docs\/modules\/learned-positional-embeddings"/g) ??
        [],
    ).toHaveLength(1);
  });

  test("page renders the registry-backed architecture graph and standard related-docs block", async () => {
    const page = await loadModelPage("gpt-2");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(page.messages.title).toBe("GPT-2");
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain('data-graph-id="graph.gpt-2-architecture"');
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('href="/docs/modules/byte-level-tokenization"');
    expect(html).toContain("Masked");
    expect(html).toContain("Multi-Head");
    expect(html).not.toContain("Missing graph record");
  });
});
