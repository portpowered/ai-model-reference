import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";

describe("DerivedRelatedDocs", () => {
  test("upgrades legacy same-variant-group requests to ontology classification siblings", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="module.grouped-query-attention"
        groups={["same-variant-group"]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="classification-siblings"');
    expect(html).toContain("Same classification: attention mechanisms");
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain("MHA");
    expect(html).toContain("MQA");
    expect(html).toContain("Same classification");
  });

  test("renders direct ontology relationships for standard FFN", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="module.standard-ffn"
        groups={["direct-relationships"]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="direct-relationships"');
    expect(html).toContain('href="/docs/modules/feed-forward-network"');
    expect(html).toContain('href="/docs/glossary/activation"');
    expect(html).toContain("Direct variant relationship");
    expect(html).toContain("Uses this topic");
  });

  test("renders shared-tags peers for the token concept glossary page", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.token"
        groups={["shared-tags", "same-concept-type"]}
      />,
    );

    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-related-group="shared-tags"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain("Shared tag");
    expect(html).toContain('data-related-group="same-concept-type"');
    expect(html).toContain('href="/docs/glossary/transformer"');
  });

  test("renders nothing when only unsupported groups are requested", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="module.grouped-query-attention"
        groups={["used-by-models"]}
      />,
    );

    expect(html).toBe("");
  });

  test("renders curated-related group when relatedIds are set on the source", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.token"
        groups={["curated-related"]}
      />,
    );

    expect(html).toContain('data-related-group="curated-related"');
    expect(html).toContain("embeddings");
    expect(html).toContain("curated");
  });

  test("renders curated-related links for MHA with attention overview and siblings", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="module.multi-head-attention"
        groups={["curated-related"]}
      />,
    );

    expect(html).toContain('data-related-group="curated-related"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("curated");
  });

  test("renders curated-related before other derived groups when both are requested", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.token"
        groups={["shared-tags", "same-concept-type", "curated-related"]}
      />,
    );

    const curatedIndex = html.indexOf('data-related-group="curated-related"');
    const sharedTagsIndex = html.indexOf('data-related-group="shared-tags"');

    expect(curatedIndex).toBeGreaterThanOrEqual(0);
    expect(sharedTagsIndex).toBeGreaterThanOrEqual(0);
    expect(curatedIndex).toBeLessThan(sharedTagsIndex);
  });

  test("renders nothing for curated-related when the source has no relatedIds", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="concept.module"
        groups={["curated-related"]}
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
