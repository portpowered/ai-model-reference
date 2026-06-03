import { describe, expect, test } from "bun:test";
import { CitationList } from "@/features/docs/components/CitationList";
import { renderToStaticMarkup } from "react-dom/server";

describe("CitationList", () => {
  test("renders MLA text and outbound links from registry citations", () => {
    const html = renderToStaticMarkup(
      <CitationList registryId="module.grouped-query-attention" />,
    );

    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Ainslie, Joshua, et al.");
    expect(html).toContain('href="https://arxiv.org/abs/2305.13245"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  test("renders citations from an explicit citationIds prop", () => {
    const html = renderToStaticMarkup(
      <CitationList citationIds={["citation.gqa-paper"]} />,
    );

    expect(html).toContain("GQA: Training Generalized Multi-Query");
  });

  test("renders nothing when citationIds is empty", () => {
    const html = renderToStaticMarkup(<CitationList citationIds={[]} />);
    expect(html).toBe("");
  });

  test("renders nothing for an unknown registry id", () => {
    const html = renderToStaticMarkup(
      <CitationList registryId="module.unknown-module" />,
    );
    expect(html).toBe("");
  });
});
