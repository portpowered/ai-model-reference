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
});
