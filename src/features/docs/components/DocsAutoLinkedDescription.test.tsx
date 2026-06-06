import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsAutoLinkedDescription } from "@/features/docs/components/DocsAutoLinkedDescription";

describe("DocsAutoLinkedDescription", () => {
  test("renders recognizable glossary phrases as internal prose links", () => {
    const html = renderToStaticMarkup(
      <DocsAutoLinkedDescription text="A dense vector that represents a token or other discrete item." />,
    );

    expect(html).toContain('href="/docs/glossary/vector"');
    expect(html).toContain('data-prose-auto-link="true"');
    expect(html).toContain("focus-visible:ring-2");
  });

  test("leaves ambiguous or unknown phrases as plain text", () => {
    const html = renderToStaticMarkup(
      <DocsAutoLinkedDescription text="Unknown phraseology without registry matches." />,
    );

    expect(html).not.toContain("data-prose-auto-link");
    expect(html).toContain("Unknown phraseology without registry matches.");
  });
});
