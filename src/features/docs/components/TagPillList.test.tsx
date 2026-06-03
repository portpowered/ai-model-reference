import { describe, expect, test } from "bun:test";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { renderToStaticMarkup } from "react-dom/server";

describe("TagPillList", () => {
  test("renders keyboard-focusable pills from registry tags", () => {
    const html = renderToStaticMarkup(
      <TagPillList registryId="module.grouped-query-attention" />,
    );

    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain("Attention");
    expect(html).toContain("Kv Cache");
  });

  test("renders pills from an explicit tags prop", () => {
    const html = renderToStaticMarkup(
      <TagPillList tags={["inference-optimization"]} />,
    );

    expect(html).toContain('href="/tags/inference-optimization"');
    expect(html).toContain("Inference Optimization");
  });

  test("renders nothing when there are no tags", () => {
    const html = renderToStaticMarkup(<TagPillList tags={[]} />);
    expect(html).toBe("");
  });

  test("renders nothing for an unknown registry id", () => {
    const html = renderToStaticMarkup(
      <TagPillList registryId="module.unknown-module" />,
    );
    expect(html).toBe("");
  });
});
