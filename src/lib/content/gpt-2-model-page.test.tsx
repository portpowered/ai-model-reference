import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { docsSearchApi } from "@/lib/search/search-server";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

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

  test.each([
    "GPT-2",
    "gpt2",
  ] as const)("search ranks the canonical gpt-2 page first for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe("/docs/models/gpt-2");
  });

  test.each([
    "decoder-only transformer",
    "byte-level tokenization model",
  ] as const)("search keeps the canonical gpt-2 page discoverable for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (result) => pageBaseUrl(result.url) === "/docs/models/gpt-2",
      ),
    ).toBe(true);
  });

  test("neighboring attention tag landing routes readers into the gpt-2 page", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "attention" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('href="/docs/models/gpt-2"');
    expect(html).toContain("GPT-2");
  });
});
