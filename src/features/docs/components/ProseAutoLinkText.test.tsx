import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";

describe("ProseAutoLinkText", () => {
  test("renders internal links for recognizable module aliases", () => {
    const html = renderToStaticMarkup(
      <ProseAutoLinkText text="Compared with multi-head attention and multi-query attention." />,
    );

    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('data-prose-auto-link="true"');
    expect(html).toContain("focus-visible:ring-2");
  });

  test("leaves ambiguous or unknown phrases as plain text", () => {
    const html = renderToStaticMarkup(
      <ProseAutoLinkText text="Unknown phraseology without registry matches." />,
    );

    expect(html).not.toContain("data-prose-auto-link");
    expect(html).toContain("Unknown phraseology without registry matches.");
  });

  test("renders inline TeX annotations while preserving surrounding auto-links", () => {
    const html = renderToStaticMarkup(
      <ProseAutoLinkText
        text={"Use $\\hat{x}$ and $x^{\\top}$ beside multi-head attention."}
      />,
    );

    expect(html).toContain('class="katex-inline not-prose"');
    expect(html).toContain('class="katex"');
    expect(html).toContain('accent="true"');
    expect(html).toContain("⊤");
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).not.toContain("katex-error");
    expect(html).not.toContain("ParseError");
  });

  test("leaves escaped dollars and block math delimiters as prose", () => {
    const html = renderToStaticMarkup(
      <ProseAutoLinkText
        text={
          "Keep \\$literal dollars and $$block math$$ delimiters untouched."
        }
      />,
    );

    expect(html).not.toContain('class="katex"');
    expect(html).toContain("$literal dollars");
    expect(html).not.toContain("\\$literal dollars");
    expect(html).toContain("$$block math$$");
  });
});
