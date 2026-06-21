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
});
