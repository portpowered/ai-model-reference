import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { compileModuleMdx } from "@/lib/content/compile-module-mdx";

describe("glossary MDX math and code rendering", () => {
  test("renders inline math, block math, and fenced code to accessible output", async () => {
    const content = await compileModuleMdx(`
# Math and code smoke

Inline softmax entry $p_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}$ in prose.

$$
H(p) = -\\sum_i p_i \\log p_i
$$

\`\`\`python
def softmax(logits):
    import math
    exp = [math.exp(z) for z in logits]
    total = sum(exp)
    return [value / total for value in exp]
\`\`\`
`);

    const html = renderToStaticMarkup(content);

    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-mathml");
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("softmax");
    expect(html).toMatch(/<figure|<pre/);
    expect(html).toMatch(/role="region"/);
    expect(html).toContain('data-rich-content-scroll="code"');
    expect(html).toContain('data-rich-content-scroll="math"');
  });

  test("renders explicit InlineMath and BlockMath components from the MDX map", async () => {
    const content = await compileModuleMdx(`
<InlineMath formula="z_i" />

<BlockMath formula="\\nabla_\\theta L(\\theta)" />
`);

    const html = renderToStaticMarkup(content);

    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('role="math"');
    expect(html).toContain("aria-label=");
  });

  test("renders inline math annotations in markdown prose", async () => {
    const content = await compileModuleMdx(`
# Inline annotation smoke

Inline annotated symbols $\\hat{x}$, $\\bar{h}$, $\\vec{v}$, and $x^{\\top}$ stay renderable in prose.
`);

    const html = renderToStaticMarkup(content);

    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-mathml");
    expect(html).toContain('accent="true"');
    expect(html).toContain("⊤");
    expect(html).not.toContain("katex-error");
    expect(html).not.toContain("ParseError");
  });
});
