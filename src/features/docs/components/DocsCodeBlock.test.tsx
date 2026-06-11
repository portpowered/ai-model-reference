import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsPre } from "@/features/docs/components/DocsCodeBlock";

describe("DocsCodeBlock", () => {
  test("renders fenced code with rich-content scroll marker on the viewport region", () => {
    const html = renderToStaticMarkup(
      <DocsPre className="language-python">{`loss.backward()`}</DocsPre>,
    );

    expect(html).toContain('data-rich-content-scroll="code"');
    expect(html).toContain('role="region"');
    expect(html).toContain("overflow-auto");
  });
});
