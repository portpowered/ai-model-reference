import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TagPillList } from "@/features/docs/components/TagPillList";

describe("TagPillList", () => {
  test("renders keyboard-focusable pills from registry tags", () => {
    const html = renderToStaticMarkup(
      <TagPillList registryId="module.grouped-query-attention" />,
    );

    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain("list-none");
    expect(html).toContain("p-0");
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/kv-cache"');
    expect(html).toContain("Attention");
    expect(html).toContain("Kv Cache");
    expect(html).toContain("no-underline");
    const withoutNoUnderline = html.replaceAll("no-underline", "");
    expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
    expect(html).toContain("focus-visible:ring-2");
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

  test("renders attention tag pill for concept.token", () => {
    const html = renderToStaticMarkup(
      <TagPillList registryId="concept.token" />,
    );

    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain("Attention");
  });

  test("renders nothing for an unknown registry id", () => {
    const html = renderToStaticMarkup(
      <TagPillList registryId="module.unknown-module" />,
    );
    expect(html).toBe("");
  });
});
