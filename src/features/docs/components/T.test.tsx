import { describe, expect, test } from "bun:test";
import { T } from "@/features/docs/components/T";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import fixture from "@/lib/content/__fixtures__/page-messages.json";
import type { PageMessages } from "@/lib/content/schemas";
import { renderToStaticMarkup } from "react-dom/server";

const messages = fixture as PageMessages;

function renderT(key: string, isDev: boolean) {
  return renderToStaticMarkup(
    <PageMessagesProvider messages={messages} isDev={isDev}>
      <T k={key} />
    </PageMessagesProvider>,
  );
}

describe("T", () => {
  test("renders localized copy for a valid key", () => {
    const html = renderT("problemStatement", false);
    expect(html).toContain(
      "KV caches grow with context length and head count.",
    );
  });

  test("shows a developer-visible error in development when the key is missing", () => {
    const html = renderT("sections.missing.body", true);
    expect(html).toContain('data-missing-message-key="sections.missing.body"');
    expect(html).toContain("Missing message key: sections.missing.body");
  });

  test("renders nothing outside development for a missing key", () => {
    const html = renderT("sections.missing.body", false);
    expect(html).toBe("");
  });
});
