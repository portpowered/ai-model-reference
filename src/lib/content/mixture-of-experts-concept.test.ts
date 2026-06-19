import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";

describe("Mixture of experts concept page", () => {
  test("loads the canonical concept page with message-driven sections and nearby MoE links", async () => {
    const page = await loadConceptPage("mixture-of-experts");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.mixture-of-experts");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Mixture of Experts");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("sparse");
    expect(page.messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "feed-forward slot",
    );
    expect(page.messages.sections?.tradeoffs.body?.toLowerCase()).toContain(
      "load-balancing",
    );
    expect(page.assets).toEqual({});

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("How Sparse Routing Changes Scaling");
    expect(html).toContain("Tradeoffs");
    expect(html).toContain("top-k");
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
    expect(html).toContain('href="/docs/modules/standard-ffn"');
    expect(html).toContain('href="/docs/modules/mixture-of-experts"');
    expect(html).toContain('href="/docs/modules/deepseekmoe"');
    expect(html).toContain('href="/docs/models/deepseek-v4-pro"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("benchmark");
  });
});
