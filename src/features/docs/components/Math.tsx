"use client";

import katex from "katex";
import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { useOptionalPageMessagesContext } from "@/features/docs/components/page-messages-context";
import { lookupMessage } from "@/lib/content/messages";

type MathProps = {
  formula?: string;
  label?: string;
  mathId?: string;
};

export function InlineMath({ formula }: MathProps) {
  const html = katex.renderToString(formula ?? "", {
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

function MathVariableDefinitions({ mathId }: { mathId: string }) {
  const context = useOptionalPageMessagesContext();

  if (!context) {
    return null;
  }

  const { messages, isDev } = context;
  const definitionsKey = `math.${mathId}.variableDefinitions`;
  const definitions = messages.math?.[mathId]?.variableDefinitions;

  if (!definitions || Object.keys(definitions).length === 0) {
    if (isDev) {
      return <MissingMessageKey messageKey={definitionsKey} reason="missing" />;
    }
    return null;
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      data-page-math-variable-definitions={mathId}
    >
      <dl className="space-y-2">
        {Object.entries(definitions).map(([id, row]) => (
          <div
            key={id}
            className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-4"
            data-math-variable-definition={id}
          >
            <dt className="w-40 shrink-0 text-sm font-medium text-foreground">
              <InlineMath formula={row.term} />
            </dt>
            <dd className="text-sm text-muted-foreground">
              <ProseAutoLinkText text={row.definition} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function BlockMath({ formula, label, mathId }: MathProps) {
  const context = useOptionalPageMessagesContext();
  const resolvedFormula =
    mathId && context
      ? lookupMessage(context.messages, `math.${mathId}.formula`)
      : null;
  const resolvedLabel =
    mathId && context
      ? lookupMessage(context.messages, `math.${mathId}.label`)
      : null;

  if (mathId && context?.isDev) {
    if (!resolvedFormula?.ok) {
      return (
        <MissingMessageKey
          messageKey={`math.${mathId}.formula`}
          reason={resolvedFormula?.reason ?? "missing"}
        />
      );
    }

    if (!resolvedLabel?.ok) {
      return (
        <MissingMessageKey
          messageKey={`math.${mathId}.label`}
          reason={resolvedLabel?.reason ?? "missing"}
        />
      );
    }
  }

  const displayFormula = resolvedFormula?.ok ? resolvedFormula.value : formula;

  if (!displayFormula) {
    return null;
  }
  const displayLabel = resolvedLabel?.ok ? resolvedLabel.value : label;
  const html = katex.renderToString(displayFormula, {
    throwOnError: false,
    displayMode: true,
  });

  return (
    <div className="not-prose my-4 flex min-w-0 max-w-full flex-col gap-3">
      {displayLabel ? (
        <p className="text-sm font-medium text-muted-foreground">
          {displayLabel}
        </p>
      ) : null}
      <div
        className="katex-display max-w-full overflow-x-auto"
        role="math"
        aria-label={displayFormula}
        data-rich-content-scroll="math"
        data-page-math-formula={mathId}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX emits trusted formula HTML from author MDX
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {mathId ? <MathVariableDefinitions mathId={mathId} /> : null}
    </div>
  );
}
