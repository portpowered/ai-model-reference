import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";

describe("ModuleMetadataCard", () => {
  test("renders ontology-backed module metadata", () => {
    const html = renderToStaticMarkup(
      <ModuleMetadataCard registryId="module.deepseekmoe" />,
    );
    expect(html).toContain('data-registry-id="module.deepseekmoe"');
    expect(html).toContain("Classification");
    expect(html).toContain("Feed Forward Networks");
    expect(html).toContain("Math level");
    expect(html).toContain("None");
    expect(html).not.toContain("Module type");
    expect(html).not.toContain("Module family");
    expect(html).not.toContain("Concept type");
    expect(html).not.toContain("Variant group");
  });

  test("uses tighter dt/dd row spacing contract", () => {
    const html = renderToStaticMarkup(
      <ModuleMetadataCard registryId="module.deepseekmoe" />,
    );

    expect(html).toContain("space-y-2");
    expect(html).not.toContain("space-y-3");
    expect(html).toContain("gap-0 sm:flex-row sm:items-baseline");
  });

  test("renders an explicit missing-record state", () => {
    const html = renderToStaticMarkup(
      <ModuleMetadataCard registryId="module.missing-runtime-record" />,
    );

    expect(html).toContain('data-registry-id="module.missing-runtime-record"');
    expect(html).toContain("Module metadata is unavailable for this record.");
    expect(html).not.toContain("<dl");
  });
});
