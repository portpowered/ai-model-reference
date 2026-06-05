import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { TBlockMath } from "@/features/docs/components/TBlockMath";
import type { PageMessages } from "@/lib/content/schemas";

const messages = {
  title: "Test",
  description: "Test page",
  math: {
    mhaSchema: {
      label: "Multi-head attention (MHA)",
      formula:
        "\\text{Attention}(Q_i, K_i, V_i) = \\mathrm{softmax}\\!\\left(\\frac{Q_i K_i^{\\top}}{\\sqrt{d_k}}\\right) V_i",
    },
  },
} satisfies PageMessages;

function renderTBlockMath(
  props: { formulaKey: string; labelKey?: string },
  isDev: boolean,
) {
  return renderToStaticMarkup(
    <PageMessagesProvider messages={messages} isDev={isDev}>
      <TBlockMath {...props} />
    </PageMessagesProvider>,
  );
}

describe("TBlockMath", () => {
  test("renders KaTeX output for a message-backed formula", () => {
    const html = renderTBlockMath(
      {
        formulaKey: "math.mhaSchema.formula",
        labelKey: "math.mhaSchema.label",
      },
      false,
    );

    expect(html).toContain('data-message-block-math="math.mhaSchema.formula"');
    expect(html).toContain('class="katex"');
    expect(html).toContain("Multi-head attention (MHA)");
  });

  test("shows a developer-visible error in development when the formula key is missing", () => {
    const html = renderTBlockMath({ formulaKey: "math.missing.formula" }, true);

    expect(html).toContain('data-missing-message-key="math.missing.formula"');
  });

  test("renders nothing outside development for a missing formula key", () => {
    const html = renderTBlockMath(
      { formulaKey: "math.missing.formula" },
      false,
    );

    expect(html).toBe("");
  });
});
