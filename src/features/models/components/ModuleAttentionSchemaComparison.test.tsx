import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import {
  ModuleAttentionSchema,
  ModuleAttentionSchemaComparison,
} from "@/features/models/components/ModuleAttentionSchemaComparison";
import {
  MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS,
} from "@/features/models/components/module-attention-math-variable-definitions";
import type { PageMessages } from "@/lib/content/schemas";

const mhaVariableDefinitions = {
  q: { term: "Q", definition: "Query vectors for head i." },
  k: { term: "K", definition: "Key vectors for head i." },
  v: { term: "V", definition: "Value vectors for head i." },
  h: { term: "H", definition: "Number of query heads." },
  dk: { term: "d_k", definition: "Key dimension per head." },
  i: { term: "i", definition: "Query head index." },
};

const gqaVariableDefinitions = {
  ...mhaVariableDefinitions,
  g: { term: "G", definition: "Number of shared KV groups." },
  gi: { term: "g(i)", definition: "KV group index for query head i." },
};

const mhaSchema = {
  label: "Multi-head attention (MHA)",
  formula:
    "\\text{Attention}(Q_i, K_i, V_i) = \\mathrm{softmax}\\!\\left(\\frac{Q_i K_i^{\\top}}{\\sqrt{d_k}}\\right) V_i",
  variableDefinitions: mhaVariableDefinitions,
};

const gqaSchema = {
  label: "Grouped-query attention (GQA)",
  formula:
    "\\text{Attention}(Q_i, K_{g(i)}, V_{g(i)}) = \\mathrm{softmax}\\!\\left(\\frac{Q_i K_{g(i)}^{\\top}}{\\sqrt{d_k}}\\right) V_{g(i)}",
  variableDefinitions: gqaVariableDefinitions,
};

const messages = {
  title: "Grouped-Query Attention",
  description: "Test page",
  math: {
    mhaSchema,
    gqaSchema,
  },
} satisfies PageMessages;

function renderComparison(
  messageOverrides: Partial<PageMessages> = {},
  isDev = false,
) {
  return renderToStaticMarkup(
    <PageMessagesProvider
      messages={{ ...messages, ...messageOverrides }}
      isDev={isDev}
    >
      <ModuleAttentionSchemaComparison />
    </PageMessagesProvider>,
  );
}

describe("ModuleAttentionSchemaComparison", () => {
  test("renders MHA and GQA KaTeX formulas from message keys", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider
        messages={{
          ...messages,
          math: {
            mhaSchema: {
              label: mhaSchema.label,
              formula: mhaSchema.formula,
            },
            gqaSchema: {
              label: gqaSchema.label,
              formula: gqaSchema.formula,
            },
          },
        }}
        isDev={false}
      >
        <ModuleAttentionSchemaComparison />
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-attention-schema-comparison="true"');
    expect(html).toContain('data-message-block-math="math.mhaSchema.formula"');
    expect(html).toContain('data-message-block-math="math.gqaSchema.formula"');
    expect(html).toContain('class="katex"');
    expect(html).toContain("Multi-head attention (MHA)");
    expect(html).toContain("Grouped-query attention (GQA)");
    expect(html).not.toContain(
      'data-attention-schema-variable-definitions="true"',
    );
  });

  test("renders symbol definitions directly under each equation", () => {
    const html = renderComparison();

    expect(html).toContain('data-attention-schema-comparison="true"');
    expect(html).toContain('data-attention-schema-variable-definitions="true"');
    expect(html).toContain('data-math-schema="mha"');
    expect(html).toContain('data-math-schema="gqa"');

    const mhaSchemaIndex = html.indexOf('data-math-schema="mha"');
    const gqaSchemaIndex = html.indexOf('data-math-schema="gqa"');
    expect(mhaSchemaIndex).toBeGreaterThanOrEqual(0);
    expect(gqaSchemaIndex).toBeGreaterThan(mhaSchemaIndex);

    const mhaChunk = html.slice(mhaSchemaIndex, gqaSchemaIndex);
    const gqaChunk = html.slice(gqaSchemaIndex);

    for (const id of MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS) {
      expect(mhaChunk).toContain(`data-math-variable-definition="${id}"`);
    }

    for (const id of MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS) {
      expect(gqaChunk).toContain(`data-math-variable-definition="${id}"`);
    }

    const mhaFormulaIndex = mhaChunk.indexOf(
      'data-message-block-math="math.mhaSchema.formula"',
    );
    const mhaFirstDefinitionIndex = mhaChunk.indexOf(
      'data-math-variable-definition="',
    );
    expect(mhaFirstDefinitionIndex).toBeGreaterThan(mhaFormulaIndex);

    const gqaFormulaIndex = gqaChunk.indexOf(
      'data-message-block-math="math.gqaSchema.formula"',
    );
    const gqaFirstDefinitionIndex = gqaChunk.indexOf(
      'data-math-variable-definition="',
    );
    expect(gqaFirstDefinitionIndex).toBeGreaterThan(gqaFormulaIndex);

    expect(html).not.toContain("Query projection");
    expect(html).not.toContain("Key projection");
    expect(html).not.toContain("Value projection");
    expect(html).toContain('data-message-block-math="math.mhaSchema.formula"');
    expect(html).toContain('data-message-block-math="math.gqaSchema.formula"');
  });

  test("renders math variable definitions in development mode", () => {
    const html = renderComparison({}, true);

    expect(html).toContain('data-attention-schema-variable-definitions="true"');
    expect(html).toContain('data-math-variable-definition="q"');
    expect(html).toContain(">Q</dt>");
    expect(html).toContain("head i");
  });

  test("shows a developer-visible error when a math variable term key is missing", () => {
    const html = renderComparison(
      {
        math: {
          mhaSchema: {
            ...mhaSchema,
            variableDefinitions: {
              ...mhaVariableDefinitions,
              q: undefined as unknown as (typeof mhaVariableDefinitions)["q"],
            },
          },
          gqaSchema,
        },
      },
      true,
    );

    expect(html).toContain(
      'data-missing-message-key="math.mhaSchema.variableDefinitions.q.term"',
    );
    expect(html).toContain(
      "Missing message key: math.mhaSchema.variableDefinitions.q.term",
    );
  });

  test("shows a developer-visible error when a math variable definition key is missing", () => {
    const html = renderComparison(
      {
        math: {
          mhaSchema: {
            ...mhaSchema,
            variableDefinitions: {
              q: { term: "Q" } as (typeof mhaVariableDefinitions)["q"],
            },
          },
          gqaSchema,
        },
      },
      true,
    );

    expect(html).toContain(
      'data-missing-message-key="math.mhaSchema.variableDefinitions.q.definition"',
    );
    expect(html).toContain(
      "Missing message key: math.mhaSchema.variableDefinitions.q.definition",
    );
  });

  test("omits variable definitions in production when no complete rows resolve", () => {
    const html = renderComparison(
      {
        math: {
          mhaSchema: {
            label: mhaSchema.label,
            formula: mhaSchema.formula,
          },
          gqaSchema: {
            label: gqaSchema.label,
            formula: gqaSchema.formula,
          },
        },
      },
      false,
    );

    expect(html).not.toContain(
      'data-attention-schema-variable-definitions="true"',
    );
    expect(html).toContain('data-message-block-math="math.mhaSchema.formula"');
  });
});

describe("ModuleAttentionSchema", () => {
  test("renders a single MHA schema block with symbol definitions", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <ModuleAttentionSchema schemaId="mha" />
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-math-schema="mha"');
    expect(html).not.toContain('data-math-schema="gqa"');
    expect(html).toContain('data-message-block-math="math.mhaSchema.formula"');
    expect(html).not.toContain(
      'data-message-block-math="math.gqaSchema.formula"',
    );
    for (const id of MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS) {
      expect(html).toContain(`data-math-variable-definition="${id}"`);
    }
  });
});
