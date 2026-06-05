import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlossaryOpening } from "@/features/docs/components/GlossaryOpening";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import type { PageMessages } from "@/lib/content/schemas";

const messages = {
  title: "Token",
  description: "The smallest unit of text a language model reads and predicts.",
  openingSummary:
    "Models use a fixed tokenizer vocabulary to drive next-token prediction rather than reading raw characters directly.",
} satisfies PageMessages;

describe("GlossaryOpening", () => {
  test("renders openingSummary from message keys", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <GlossaryOpening />
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-testid="glossary-opening"');
    expect(html).toContain(messages.openingSummary);
  });
});
