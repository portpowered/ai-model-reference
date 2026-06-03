import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";

describe("ModuleMetadataCard", () => {
  test("renders registry-backed module metadata", () => {
    const html = renderToStaticMarkup(
      <ModuleMetadataCard registryId="module.grouped-query-attention" />,
    );
    expect(html).toContain('data-registry-id="module.grouped-query-attention"');
    expect(html).toContain("Attention");
    expect(html).toContain("Attention Head Sharing");
    expect(html).toContain("Light");
  });
});
