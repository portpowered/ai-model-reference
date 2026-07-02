import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrainingRegimeAtAGlance } from "@/features/models/components/TrainingRegimeAtAGlance";

describe("TrainingRegimeAtAGlance", () => {
  test("renders the ontology-backed regime label", () => {
    const html = renderToStaticMarkup(
      <TrainingRegimeAtAGlance registryId="training-regime.dpo" />,
    );

    expect(html).toContain('data-registry-id="training-regime.dpo"');
    expect(html).toContain("Regime type");
    expect(html).toContain("Training Alignment");
    expect(html).not.toContain(">Alignment<");
  });

  test("keeps related-module empty states and compatibility regime labels readable", () => {
    const html = renderToStaticMarkup(
      <TrainingRegimeAtAGlance registryId="training-regime.specialist-training" />,
    );

    expect(html).toContain(
      'data-registry-id="training-regime.specialist-training"',
    );
    expect(html).toContain("Regime type");
    expect(html).toContain("Post Training");
    expect(html).toContain("Related modules");
    expect(html).toContain('href="/docs/modules/deepseekmoe"');
    expect(html).not.toContain(">post-training<");
  });

  test("renders the empty related-modules state without blank rows", () => {
    const html = renderToStaticMarkup(
      <TrainingRegimeAtAGlance registryId="training-regime.dpo" />,
    );

    expect(html).toContain("Related modules");
    expect(html).toContain("No related modules listed yet.");
  });
});
