"use client";

import { InlineMath } from "@/features/docs/components/Math";
import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { TBlockMath } from "@/features/docs/components/TBlockMath";
import { lookupMessage } from "@/lib/content/messages";

type PageMathFormulaProps = {
  mathId: string;
};

function PageMathVariableDefinitions({ mathId }: PageMathFormulaProps) {
  const { messages, isDev } = usePageMessages();
  const definitionsKey = `math.${mathId}.variableDefinitions`;
  const definitions = messages.math?.[mathId]?.variableDefinitions;

  if (!definitions || Object.keys(definitions).length === 0) {
    if (isDev) {
      return <MissingMessageKey messageKey={definitionsKey} reason="missing" />;
    }
    return null;
  }

  const rows = Object.entries(definitions).map(([id]) => {
    const termKey = `math.${mathId}.variableDefinitions.${id}.term`;
    const definitionKey = `math.${mathId}.variableDefinitions.${id}.definition`;
    const termResult = lookupMessage(messages, termKey);
    const definitionResult = lookupMessage(messages, definitionKey);

    return { id, termKey, definitionKey, termResult, definitionResult };
  });

  if (!isDev) {
    const completeRows = rows.flatMap((row) => {
      if (!row.termResult.ok || !row.definitionResult.ok) {
        return [];
      }

      return [
        {
          id: row.id,
          term: row.termResult.value,
          definition: row.definitionResult.value,
        },
      ];
    });

    if (completeRows.length === 0) {
      return null;
    }

    return (
      <div
        className="rounded-lg border border-border bg-card p-4"
        data-page-math-variable-definitions={mathId}
      >
        <dl className="space-y-2">
          {completeRows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-4"
              data-math-variable-definition={row.id}
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

  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      data-page-math-variable-definitions={mathId}
    >
      <dl className="space-y-2">
        {rows.map((row) => {
          if (!row.termResult.ok) {
            return (
              <MissingMessageKey
                key={row.id}
                messageKey={row.termKey}
                reason={row.termResult.reason}
              />
            );
          }

          if (!row.definitionResult.ok) {
            return (
              <MissingMessageKey
                key={row.id}
                messageKey={row.definitionKey}
                reason={row.definitionResult.reason}
              />
            );
          }

          return (
            <div
              key={row.id}
              className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-4"
              data-math-variable-definition={row.id}
            >
              <dt className="w-40 shrink-0 text-sm font-medium text-foreground">
                <InlineMath formula={row.termResult.value} />
              </dt>
              <dd className="text-sm text-muted-foreground">
                <ProseAutoLinkText text={row.definitionResult.value} />
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function PageMathFormula({ mathId }: PageMathFormulaProps) {
  return (
    <div
      className="not-prose my-4 flex flex-col gap-3"
      data-page-math-formula={mathId}
    >
      <TBlockMath
        labelKey={`math.${mathId}.label`}
        formulaKey={`math.${mathId}.formula`}
      />
      <PageMathVariableDefinitions mathId={mathId} />
    </div>
  );
}
