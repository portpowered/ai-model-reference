import { describe, expect, test } from "bun:test";
import { ModuleAtAGlance } from "@/features/models/components/ModuleAtAGlance";
import { renderToStaticMarkup } from "react-dom/server";

describe("ModuleAtAGlance", () => {
  test("renders registry-backed optimizes and practical benefits", () => {
    const html = renderToStaticMarkup(
      <ModuleAtAGlance registryId="module.grouped-query-attention" />,
    );
    expect(html).toContain("Kv Cache");
    expect(html).toContain("lower KV-cache memory");
    expect(html).toContain("reduced memory bandwidth during inference");
  });
});
