import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelAtAGlance } from "@/features/models/components/ModelAtAGlance";

describe("ModelAtAGlance", () => {
  test("renders explicit release metadata inside the at-a-glance section", () => {
    const html = renderToStaticMarkup(
      <ModelAtAGlance registryId="model.gpt-3" />,
    );

    expect(html).toContain("Released");
    expect(html).toContain("May 2020");
    expect(html).toContain("Tom B. Brown, Benjamin Mann, Nick Ryder, et al.");
    expect(html).toContain("Language Models are Few-Shot Learners");
    expect(html).toContain('href="https://arxiv.org/abs/2005.14165"');
    expect(html).toContain("175 billion parameters");
  });
});
