import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { ModuleAttentionSchemaComparison } from "@/features/models/components/ModuleAttentionSchemaComparison";
import type { PageMessages } from "@/lib/content/schemas";

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
  });
});
