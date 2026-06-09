import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { T } from "@/features/docs/components/T";
import fixture from "@/lib/content/__fixtures__/page-messages.json";
import { expectHtmlToContainProse } from "@/lib/content/glossary-test-helpers";
import type { PageMessages } from "@/lib/content/schemas";

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
    expectHtmlToContainProse(
      html,
      "KV caches grow with context length and head count.",
    );
  });

  test("auto-links recognizable registry aliases in localized prose", () => {
    const html = renderT("sections.whatItIs.body", false);
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('data-prose-auto-link="true"');
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
