import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CitationList } from "@/features/docs/components/CitationList";

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

  test("renders nothing when concept.token has empty citationIds", () => {
    const html = renderToStaticMarkup(
      <CitationList registryId="concept.token" />,
    );
    expect(html).toBe("");
  });

  test("renders origin and usage citations for on-policy distillation", () => {
    const html = renderToStaticMarkup(
      <CitationList registryId="training-regime.on-policy-distillation" />,
    );

    expect(html).toContain(
      "On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes",
    );
    expect(html).toContain('href="https://openreview.net/forum?id=3zKtaqxLhW"');
    expect(html).toContain("DeepSeek-V4 Technical Report");
  });

  test("renders V4, generic sparse-attention, and DeepSeek sparse-attention papers for CSA", () => {
    const html = renderToStaticMarkup(
      <CitationList registryId="module.compressed-sparse-attention" />,
    );

    expect(html).toContain("DeepSeek-V4 Technical Report");
    expect(html).toContain(
      "Generating Long Sequences with Sparse Transformers",
    );
    expect(html).toContain(
      "Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention",
    );
    expect(html).toContain('href="https://arxiv.org/abs/1904.10509"');
    expect(html).toContain(
      'href="https://aclanthology.org/2025.acl-long.1126/"',
    );
  });

  test("renders nothing for an unknown registry id", () => {
    const html = renderToStaticMarkup(
      <CitationList registryId="module.unknown-module" />,
    );
    expect(html).toBe("");
  });
});
