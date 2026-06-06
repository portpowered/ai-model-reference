import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { ModuleAttentionSchemaComparison } from "@/features/models/components/ModuleAttentionSchemaComparison";
import { MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS } from "@/features/models/components/module-attention-math-variable-definitions";
import type { PageMessages } from "@/lib/content/schemas";

const mathVariableDefinitions = {
  title: "What the symbols mean",
  q: {
    term: "Q",
    definition: "Query vectors for each attention head.",
  },
  k: {
    term: "K",
    definition: "Key vectors for each position.",
  },
  v: {
    term: "V",
    definition: "Value vectors for each position.",
  },
  queryProjection: {
    term: "Query projection",
    definition: "Linear map from hidden states to query heads.",
  },
  keyProjection: {
    term: "Key projection",
    definition: "Linear map from hidden states to key heads.",
  },
  valueProjection: {
    term: "Value projection",
    definition: "Linear map from hidden states to value heads.",
  },
  queryHeads: {
    term: "Query heads",
    definition: "H separate query streams.",
  },
  keyValueHeads: {
    term: "Key-value heads",
    definition: "Paired key and value heads.",
  },
  grouping: {
    term: "Query-to-KV grouping",
    definition: "Mapping that routes query heads to shared KV pairs.",
  },
} satisfies PageMessages["mathVariableDefinitions"];

const messages = {
  title: "Grouped-Query Attention",
  description: "Test page",
  math: {
    mhaSchema: {
      label: "Multi-head attention (MHA)",
      formula:
        "\\text{Attention}(Q_i, K_i, V_i) = \\mathrm{softmax}\\!\\left(\\frac{Q_i K_i^{\\top}}{\\sqrt{d_k}}\\right) V_i",
    },
    gqaSchema: {
      label: "Grouped-query attention (GQA)",
      formula:
        "\\text{Attention}(Q_i, K_{g(i)}, V_{g(i)}) = \\mathrm{softmax}\\!\\left(\\frac{Q_i K_{g(i)}^{\\top}}{\\sqrt{d_k}}\\right) V_{g(i)}",
    },
  },
} satisfies PageMessages;

describe("ModuleAttentionSchemaComparison", () => {
  test("renders MHA and GQA KaTeX formulas from message keys", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
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

  test("renders plain-language math variable definitions from message keys", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider
        messages={{ ...messages, mathVariableDefinitions }}
        isDev={false}
      >
        <ModuleAttentionSchemaComparison />
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-attention-schema-comparison="true"');
    expect(html).toContain('data-attention-schema-variable-definitions="true"');
    expect(html).toContain("What the symbols mean");

    for (const id of MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS) {
      expect(html).toContain(`data-math-variable-definition="${id}"`);
    }

    expect(html).toContain("Query projection");
    expect(html).toContain("Key projection");
    expect(html).toContain("Value projection");
    expect(html).toContain("Query heads");
    expect(html).toContain("Key-value heads");
    expect(html).toContain("Query-to-KV grouping");
    expect(html).toContain('data-message-block-math="math.mhaSchema.formula"');
    expect(html).toContain('data-message-block-math="math.gqaSchema.formula"');
  });
});
