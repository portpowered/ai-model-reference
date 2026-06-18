import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModuleAtAGlance } from "@/features/models/components/ModuleAtAGlance";

describe("ModuleAtAGlance", () => {
  test("renders registry-backed optimizes and practical benefits", () => {
    const html = renderToStaticMarkup(
      <ModuleAtAGlance registryId="module.grouped-query-attention" />,
    );
    expect(html).toContain("Released");
    expect(html).toContain("May 2023");
    expect(html).toContain(
      "Joshua Ainslie, James Lee-Thorp, Seth R. Robertson, et al.",
    );
    expect(html).toContain(
      "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
    );
    expect(html).toContain("Kv Cache");
    expect(html).toContain("lower KV-cache memory");
    expect(html).toContain("reduced memory bandwidth during inference");
  });

  test("uses bulletless list styling consistent with TagResourceList", () => {
    const html = renderToStaticMarkup(
      <ModuleAtAGlance registryId="module.grouped-query-attention" />,
    );

    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
    expect(html).not.toContain("pl-5");
  });

  test("renders original sparse-attention release metadata from the origin paper", () => {
    const html = renderToStaticMarkup(
      <ModuleAtAGlance registryId="module.sparse-attention" />,
    );

    expect(html).toContain("Released");
    expect(html).toContain("April 2019");
    expect(html).toContain("Rewon Child, Scott Gray, Alec Radford, et al.");
    expect(html).toContain(
      "Generating Long Sequences with Sparse Transformers",
    );
  });

  test("renders MLA release metadata from the DeepSeek-V2 paper", () => {
    const html = renderToStaticMarkup(
      <ModuleAtAGlance registryId="module.multi-head-latent-attention" />,
    );

    expect(html).toContain("Released");
    expect(html).toContain("May 2024");
    expect(html).toContain("DeepSeek-AI");
    expect(html).toContain(
      "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model",
    );
  });
});
