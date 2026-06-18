import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsAutoLinkedDescription } from "@/features/docs/components/DocsAutoLinkedDescription";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";

const TEST_PAGE_MESSAGES = {
  title: "Test page",
  description: "Test description",
};

describe("DocsAutoLinkedDescription", () => {
  test("renders recognizable glossary phrases as internal prose links", () => {
    const html = renderToStaticMarkup(
      <DocsAutoLinkedDescription text="A dense vector that represents a token or other discrete item." />,
    );

    expect(html).toContain('href="/docs/glossary/vector"');
    expect(html).toContain('data-prose-auto-link="true"');
    expect(html).toContain("focus-visible:ring-2");
  });

  test("localizes shipped glossary links when the description renders inside page locale context", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider
        messages={TEST_PAGE_MESSAGES}
        locale="vi"
        isDev={false}
      >
        <DocsAutoLinkedDescription text="Một vector dày đặc biểu diễn token hoặc mục rời rạc khác." />
      </PageMessagesProvider>,
    );

    expect(html).toContain('href="/vi/docs/glossary/token"');
    expect(html).toContain('href="/docs/glossary/vector"');
    expect(html).not.toContain('href="/docs/glossary/token"');
    expect(html).not.toContain('href="/vi/docs/glossary/vector"');
  });

  test("leaves ambiguous or unknown phrases as plain text", () => {
    const html = renderToStaticMarkup(
      <DocsAutoLinkedDescription text="Unknown phraseology without registry matches." />,
    );

    expect(html).not.toContain("data-prose-auto-link");
    expect(html).toContain("Unknown phraseology without registry matches.");
  });
});
