import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RelatedDocList } from "@/features/docs/components/RelatedDocList";

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
});
