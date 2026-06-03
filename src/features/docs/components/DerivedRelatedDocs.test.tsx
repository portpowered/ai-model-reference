import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";

describe("DerivedRelatedDocs", () => {
  test("renders same-variant-group peers with reason labels for GQA", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="module.grouped-query-attention"
        groups={["same-variant-group"]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-derived-group="same-variant-group"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain("MHA");
    expect(html).toContain("MQA");
    expect(html).toContain("Same variant group");
  });

  test("renders shared-tags peers for the token concept glossary page", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.token"
        groups={["shared-tags", "same-concept-type"]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-derived-group="shared-tags"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain("Shared tag");
    expect(html).not.toContain('data-derived-group="same-concept-type"');
  });

  test("renders nothing when only unsupported groups are requested", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="module.grouped-query-attention"
        groups={["used-by-models", "curated-related"]}
      />,
    );

    expect(html).toBe("");
  });

  test("renders nothing for an unknown registry id", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="module.unknown"
        groups={["same-variant-group"]}
      />,
    );

    expect(html).toBe("");
  });
});
