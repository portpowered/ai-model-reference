import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";

describe("RelatedDocs", () => {
  test("renders routing as a curated related destination from nearby shipped pages", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.mixture-of-experts" />,
    );

    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain(">Routing<");
  });

  test("renders ontology-derived groups ahead of curated links on grouped-query attention", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.grouped-query-attention" />,
    );

    expect(html).toContain('data-related-group="classification-siblings"');
    expect(html).toContain("Same classification: attention mechanisms");
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html.indexOf('data-testid="curated-related-docs"')).toBeLessThan(
      html.indexOf('data-related-group="classification-siblings"'),
    );
  });
});
