import { describe, expect, test } from "bun:test";
import { Section } from "@/features/docs/components/Section";
import { T } from "@/features/docs/components/T";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import fixture from "@/lib/content/__fixtures__/page-messages.json";
import type { PageMessages } from "@/lib/content/schemas";
import { renderToStaticMarkup } from "react-dom/server";

const messages = fixture as PageMessages;

function renderSection(isDev: boolean) {
  return renderToStaticMarkup(
    <PageMessagesProvider messages={messages} isDev={isDev}>
      <Section id="what-it-is" titleKey="sections.whatItIs.title">
        <T k="sections.whatItIs.body" />
      </Section>
    </PageMessagesProvider>,
  );
}

describe("Section", () => {
  test("renders heading from titleKey and body from T", () => {
    const html = renderSection(false);
    expect(html).toContain('id="what-it-is"');
    expect(html).toContain("<h2>What It Is</h2>");
    expect(html).toContain(
      "Grouped-query attention is an attention variant derived from multi-head attention.",
    );
  });

  test("shows a developer-visible heading error in development when titleKey is missing", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev>
        <Section id="broken" titleKey="sections.missing.title">
          <span>child</span>
        </Section>
      </PageMessagesProvider>,
    );
    expect(html).toContain('data-missing-message-key="sections.missing.title"');
  });
});
