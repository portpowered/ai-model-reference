import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelTrainingSummary } from "@/features/models/components/ModelTrainingSummary";

describe("ModelTrainingSummary", () => {
  test("omits empty training and paper placeholders when a model has no linked records", () => {
    const html = renderToStaticMarkup(
      <ModelTrainingSummary registryId="model.gpt-2" />,
    );

    expect(html).toBe("");
  });

  test("renders only populated training sections for models with linked records", () => {
    const html = renderToStaticMarkup(
      <ModelTrainingSummary registryId="model.deepseek-v4-pro" />,
    );

    expect(html).toContain("Training regimes");
    expect(html).toContain("Linked papers");
    expect(html).not.toContain("No training regimes listed yet.");
    expect(html).not.toContain("No linked paper pages listed yet.");
  });
});
