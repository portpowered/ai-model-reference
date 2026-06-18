import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelsUsingModule } from "@/features/models/components/ModelsUsingModule";

describe("ModelsUsingModule", () => {
  test("renders example model links when the module has published example models", () => {
    const html = renderToStaticMarkup(
      <ModelsUsingModule registryId="module.causal-attention" />,
    );

    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain(">GPT-3<");
    expect(html).not.toContain("later story");
  });

  test("renders an empty state when the module has no linked models", () => {
    const html = renderToStaticMarkup(
      <ModelsUsingModule registryId="module.multi-head-attention" />,
    );

    expect(html).toContain("No example models listed yet.");
  });
});
