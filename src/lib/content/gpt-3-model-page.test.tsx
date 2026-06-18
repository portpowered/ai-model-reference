import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";

describe("gpt-3 model page related docs", () => {
  test("derived related docs do not duplicate module-backed positional links", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="model.gpt-3"
        groups={[
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ]}
      />,
    );

    expect(
      html.match(/href="\/docs\/modules\/alibi"/g) ?? [],
    ).toHaveLength(1);
    expect(
      html.match(/href="\/docs\/modules\/learned-positional-embeddings"/g) ??
        [],
    ).toHaveLength(1);
  });

  test("page relies on the derived related docs block without a second curated list", async () => {
    const page = await loadModelPage("gpt-3");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain('data-testid="curated-related-docs"');
  });
});
