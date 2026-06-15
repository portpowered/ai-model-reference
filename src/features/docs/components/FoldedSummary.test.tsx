import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FoldedSummary } from "@/features/docs/components/FoldedSummary";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { expectHtmlToContainProse } from "@/lib/content/glossary-test-helpers";
import type { PageMessages } from "@/lib/content/schemas";

const messages = {
  title: "Grouped-Query Attention",
  description: "An attention variant.",
  openingSummary:
    "KV caches grow with context length and head count; grouped-query attention lets several query heads share fewer key-value heads.",
} satisfies PageMessages;

function renderFoldedSummary(isDev: boolean) {
  return renderToStaticMarkup(
    <PageMessagesProvider messages={messages} isDev={isDev}>
      <FoldedSummary />
    </PageMessagesProvider>,
  );
}

describe("FoldedSummary", () => {
  test("renders a collapsed details block with folded-summary markers", () => {
    const html = renderFoldedSummary(false);

    expect(html).toContain('data-testid="folded-summary"');
    expect(html).toContain('data-folded-summary="true"');
    expect(html).toContain('data-opening-summary="folded"');
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).not.toContain(" open");
    expectHtmlToContainProse(
      html,
      "KV caches grow with context length and head count",
    );
  });

  test("shows a developer-visible error when openingSummary is missing", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider
        messages={{ title: "Example", description: "Example page." }}
        isDev
      >
        <FoldedSummary />
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-missing-message-key="openingSummary"');
  });

  test("renders nothing outside development when openingSummary is missing", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider
        messages={{ title: "Example", description: "Example page." }}
        isDev={false}
      >
        <FoldedSummary />
      </PageMessagesProvider>,
    );

    expect(html).toBe("");
  });
});
