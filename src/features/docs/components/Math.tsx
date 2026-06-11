import katex from "katex";

type MathProps = {
  formula: string;
};

export function InlineMath({ formula }: MathProps) {
  const html = katex.renderToString(formula, {
    throwOnError: false,
    displayMode: false,
  });

  return (
    <span
      className="katex-inline not-prose"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX emits trusted formula HTML from author MDX
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function BlockMath({ formula }: MathProps) {
  const html = katex.renderToString(formula, {
    throwOnError: false,
    displayMode: true,
  });

  return (
    <div
      className="katex-display my-4 max-w-full overflow-x-auto not-prose"
      role="math"
      aria-label={formula}
      data-rich-content-scroll="math"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX emits trusted formula HTML from author MDX
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
