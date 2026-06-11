"use client";

import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { TBlockMath } from "@/features/docs/components/TBlockMath";
import {
  type ModuleAttentionMathSchemaId,
  moduleAttentionMathVariableDefinitionIdsForSchema,
} from "@/features/models/components/module-attention-math-variable-definitions";
import { lookupMessage } from "@/lib/content/messages";

type SchemaFormulaBlockProps = {
  schemaId: ModuleAttentionMathSchemaId;
  labelKey: string;
  formulaKey: string;
};

function ModuleAttentionSchemaVariableDefinitions({
  schemaId,
}: {
  schemaId: ModuleAttentionMathSchemaId;
}) {
  const { messages, isDev } = usePageMessages();
  const definitionIds =
    moduleAttentionMathVariableDefinitionIdsForSchema(schemaId);

  const rows = definitionIds.map((id) => {
    const termKey = `math.${schemaId}Schema.variableDefinitions.${id}.term`;
    const definitionKey = `math.${schemaId}Schema.variableDefinitions.${id}.definition`;
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
        data-attention-schema-variable-definitions="true"
      >
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
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-4"
      data-attention-schema-variable-definitions="true"
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
                {row.termResult.value}
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

function SchemaFormulaBlock({
  schemaId,
  labelKey,
  formulaKey,
}: SchemaFormulaBlockProps) {
  return (
    <div
      className="flex min-w-0 max-w-full flex-col gap-3"
      data-math-schema={schemaId}
      data-attention-schema-formula="true"
    >
      <TBlockMath labelKey={labelKey} formulaKey={formulaKey} />
      <ModuleAttentionSchemaVariableDefinitions schemaId={schemaId} />
    </div>
  );
}

export function ModuleAttentionSchema({
  schemaId = "mha",
}: {
  schemaId?: ModuleAttentionMathSchemaId;
}) {
  return (
    <div
      className="not-prose my-4 flex flex-col gap-6"
      data-attention-schema-comparison="true"
    >
      <SchemaFormulaBlock
        schemaId={schemaId}
        labelKey={`math.${schemaId}Schema.label`}
        formulaKey={`math.${schemaId}Schema.formula`}
      />
    </div>
  );
}

export function ModuleAttentionSchemaComparison() {
  return (
    <div
      className="not-prose my-4 flex flex-col gap-6"
      data-attention-schema-comparison="true"
    >
      <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-4">
        <SchemaFormulaBlock
          schemaId="mha"
          labelKey="math.mhaSchema.label"
          formulaKey="math.mhaSchema.formula"
        />
        <SchemaFormulaBlock
          schemaId="gqa"
          labelKey="math.gqaSchema.label"
          formulaKey="math.gqaSchema.formula"
        />
      </div>
    </div>
  );
}

export function ModuleAttentionMhaMqaSchemaComparison() {
  return (
    <div
      className="not-prose my-4 flex flex-col gap-6"
      data-attention-schema-comparison="true"
    >
      <div className="flex flex-col gap-6 sm:grid sm:grid-cols-2 sm:gap-4">
        <SchemaFormulaBlock
          schemaId="mha"
          labelKey="math.mhaSchema.label"
          formulaKey="math.mhaSchema.formula"
        />
        <SchemaFormulaBlock
          schemaId="mqa"
          labelKey="math.mqaSchema.label"
          formulaKey="math.mqaSchema.formula"
        />
      </div>
    </div>
  );
}
