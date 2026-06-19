import katex from "katex";

type MathProps = {
  formula: string;
  label?: string;
  variableDefinitions?: ReadonlyArray<{
    definition: string;
    term: string;
  }>;
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

export function BlockMath({ formula, label, variableDefinitions }: MathProps) {
  const html = katex.renderToString(formula, {
    throwOnError: false,
    displayMode: true,
  });

  return (
    <div className="not-prose my-4 flex min-w-0 max-w-full flex-col gap-3">
      {label ? (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      ) : null}
      <div
        className="katex-display max-w-full overflow-x-auto"
        role="math"
        aria-label={formula}
        data-rich-content-scroll="math"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX emits trusted formula HTML from author MDX
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {variableDefinitions && variableDefinitions.length > 0 ? (
        <div
          className="rounded-lg border border-border bg-card p-4"
          data-page-math-variable-definitions="inline"
        >
          <dl className="space-y-2">
            {variableDefinitions.map((row) => (
              <div
                key={row.term}
                className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <dt className="w-40 shrink-0 text-sm font-medium text-foreground">
                  <InlineMath formula={row.term} />
                </dt>
                <dd className="text-sm text-muted-foreground">
                  {row.definition}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
