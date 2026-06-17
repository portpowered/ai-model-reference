import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RelatedDocList } from "@/features/docs/components/RelatedDocList";

const TEST_PAGE_MESSAGES = {
  title: "Test page",
  description: "Test description",
};

describe("RelatedDocList", () => {
  test("renders related doc links without underline utilities", () => {
    const html = renderToStaticMarkup(
      <RelatedDocList
        testId="curated-related-docs"
        items={[
          {
            registryId: "concept.embedding",
            slug: "embedding",
            title: "Embedding",
            href: "/docs/glossary/embedding",
            reasonLabel: "Prerequisite",
            isPlanned: false,
          },
        ]}
      />,
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/glossary/embedding"');
    expect(html).toContain("Embedding");
    expect(html).toContain("no-underline");
    const withoutNoUnderline = html.replaceAll("no-underline", "");
    expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
    expect(html).toContain("focus-visible:ring-2");
  });

  test("localizes shipped Vietnamese docs and tag links from page context", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider
        messages={TEST_PAGE_MESSAGES}
        locale="vi"
        isDev={false}
      >
        <RelatedDocList
          items={[
            {
              registryId: "concept.embedding",
              slug: "embedding",
              title: "Embedding",
              href: "/docs/glossary/embedding",
              reasonLabel: "Prerequisite",
              isPlanned: false,
            },
            {
              registryId: "tag.attention",
              slug: "attention",
              title: "Attention",
              href: "/tags/attention",
              reasonLabel: "Variant group",
              isPlanned: false,
            },
          ]}
        />
      </PageMessagesProvider>,
    );

    expect(html).toContain('href="/vi/docs/glossary/embedding"');
    expect(html).toContain('href="/vi/tags/attention"');
  });

  test("falls back to canonical docs routes for unshipped localized targets", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider
        messages={TEST_PAGE_MESSAGES}
        locale="vi"
        isDev={false}
      >
        <RelatedDocList
          items={[
            {
              registryId: "concept.tensor",
              slug: "tensor",
              title: "Tensor",
              href: "/docs/glossary/tensor",
              reasonLabel: "Background",
              isPlanned: false,
            },
          ]}
        />
      </PageMessagesProvider>,
    );

    expect(html).toContain('href="/docs/glossary/tensor"');
    expect(html).not.toContain('href="/vi/docs/glossary/tensor"');
  });

  test("renders plain text entries and planned state when no href is present", () => {
    const html = renderToStaticMarkup(
      <RelatedDocList
        items={[
          {
            registryId: "concept.future",
            slug: "future",
            title: "Future concept",
            reasonLabel: "Planned follow-up",
            isPlanned: true,
          },
        ]}
      />,
    );

    expect(html).toContain("Future concept");
    expect(html).toContain('data-planned="true"');
    expect(html).not.toContain("<a");
  });

  test("returns null when there are no items", () => {
    const html = renderToStaticMarkup(<RelatedDocList items={[]} />);

    expect(html).toBe("");
  });
});
