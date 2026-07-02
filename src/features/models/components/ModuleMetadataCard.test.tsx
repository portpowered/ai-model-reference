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

  test("renders useful ontology-backed labels for activation and feed-forward proving records", () => {
    const activationHtml = renderToStaticMarkup(
      <ModuleMetadataCard registryId="module.silu" />,
    );
    const feedForwardHtml = renderToStaticMarkup(
      <ModuleMetadataCard registryId="module.swiglu" />,
    );

    expect(activationHtml).toContain('data-registry-id="module.silu"');
    expect(activationHtml).toContain("Classification");
    expect(activationHtml).toContain("Activation Functions");
    expect(activationHtml).toContain("Math level");
    expect(activationHtml).toContain("None");
    expect(activationHtml).not.toContain("Module type");
    expect(activationHtml).not.toContain("Module family");
    expect(activationHtml).not.toContain("Concept type");
    expect(activationHtml).not.toContain("Variant group");

    expect(feedForwardHtml).toContain('data-registry-id="module.swiglu"');
    expect(feedForwardHtml).toContain("Classification");
    expect(feedForwardHtml).toContain("Feed Forward Networks");
    expect(feedForwardHtml).toContain("Math level");
    expect(feedForwardHtml).toContain("None");
    expect(feedForwardHtml).not.toContain("Module type");
    expect(feedForwardHtml).not.toContain("Module family");
    expect(feedForwardHtml).not.toContain("Concept type");
    expect(feedForwardHtml).not.toContain("Variant group");
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
