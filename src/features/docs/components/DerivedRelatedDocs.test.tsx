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

  test("renders nothing when only unsupported groups are requested", () => {
    const html = renderToStaticMarkup(
      <DerivedRelatedDocs
        registryId="module.grouped-query-attention"
        groups={["same-concept-type", "shared-tags"]}
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
