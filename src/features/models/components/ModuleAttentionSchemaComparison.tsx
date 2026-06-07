"use client";

import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { TBlockMath } from "@/features/docs/components/TBlockMath";
import { MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS } from "@/features/models/components/module-attention-math-variable-definitions";
import { lookupMessage } from "@/lib/content/messages";

function ModuleAttentionVariableDefinitions() {
  const { messages, isDev } = usePageMessages();
  const titleResult = lookupMessage(messages, "mathVariableDefinitions.title");

  if (!titleResult.ok) {
    if (isDev) {
      return (
        <MissingMessageKey
          messageKey="mathVariableDefinitions.title"
          reason={titleResult.reason}
        />
      );
    }
    return null;
  }

  const rows = MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS.map((id) => {
    const termKey = `mathVariableDefinitions.${id}.term`;
    const definitionKey = `mathVariableDefinitions.${id}.definition`;
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
      <section
        className="rounded-lg border border-border bg-card p-4"
        data-attention-schema-variable-definitions="true"
      >
        <h3 className="mb-3 text-sm font-medium text-foreground">
          {titleResult.value}
        </h3>
        <dl className="space-y-2">
          {completeRows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:gap-4"
              data-math-variable-definition={row.id}
            >
              <dt className="w-40 shrink-0 text-sm font-medium text-foreground">
                {row.term}
              </dt>
              <dd className="text-sm text-muted-foreground">
                <ProseAutoLinkText text={row.definition} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-4"
      data-attention-schema-variable-definitions="true"
    >
      <h3 className="mb-3 text-sm font-medium text-foreground">
        {titleResult.value}
      </h3>
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
                {row.termResult.value}
              </dt>
              <dd className="text-sm text-muted-foreground">
                <ProseAutoLinkText text={row.definitionResult.value} />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export function ModuleAttentionSchemaComparison() {
  return (
    <div
      className="not-prose my-4 flex flex-col gap-6"
      data-attention-schema-comparison="true"
    >
      <ModuleAttentionVariableDefinitions />
      <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-4">
        <TBlockMath
          labelKey="math.mhaSchema.label"
          formulaKey="math.mhaSchema.formula"
        />
        <TBlockMath
          labelKey="math.gqaSchema.label"
          formulaKey="math.gqaSchema.formula"
        />
      </div>
    </div>
  );
}
