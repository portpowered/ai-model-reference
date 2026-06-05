import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeBrushHeader } from "@/components/home/home-brush-header";

describe("HomeBrushHeader", () => {
  test("omits oversized bottom margin on the hero wrapper", () => {
    const html = renderToStaticMarkup(
      <HomeBrushHeader
        title="Model Atlas"
        subtitle="A reference for LLM concepts"
      />,
    );

    expect(html).toContain("<header");
    expect(html).not.toContain("mb-8");
    expect(html).toContain("Model Atlas");
    expect(html).toContain("A reference for LLM concepts");
    expect(html).toContain("Decorative brush stroke background");
  });
});
