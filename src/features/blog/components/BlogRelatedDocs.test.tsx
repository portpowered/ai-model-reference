import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BLOG_RELATED_DOCS_ALL_UNAVAILABLE_FALLBACK,
  BLOG_RELATED_DOCS_EMPTY_FALLBACK,
  BLOG_RELATED_DOCS_PARTIAL_UNAVAILABLE_STATUS,
  BlogRelatedDocs,
} from "@/features/blog/components/BlogRelatedDocs";
import {
  RELATED_REGISTRY_DOCS_MISSING_ID,
  relatedRegistryDocsDraftModule,
  relatedRegistryDocsGqa,
  relatedRegistryDocsMqa,
  relatedRegistryDocsResolveOptions,
} from "@/lib/content/related-registry-docs.test-fixtures";

afterEach(() => {
  cleanup();
});

describe("BlogRelatedDocs", () => {
  test("passes explicit relatedDocIds through to compact published links", () => {
    const html = renderToStaticMarkup(
      <BlogRelatedDocs
        relatedDocIds={[relatedRegistryDocsMqa.id, relatedRegistryDocsGqa.id]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('data-testid="blog-related-docs"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("Multi-Query Attention");
    expect(html).toContain("Grouped Query Attention");
    expect(html).toContain("no-underline");
    expect(html).not.toContain(relatedRegistryDocsMqa.id);
  });

  test("renders blog empty fallback when relatedDocIds is empty", () => {
    const html = renderToStaticMarkup(
      <BlogRelatedDocs
        relatedDocIds={[]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('data-testid="blog-related-docs-empty"');
    expect(html).toContain(BLOG_RELATED_DOCS_EMPTY_FALLBACK);
    expect(html).not.toContain("<a");
  });

  test("renders all-unavailable fallback without broken anchors", () => {
    const html = renderToStaticMarkup(
      <BlogRelatedDocs
        relatedDocIds={[
          RELATED_REGISTRY_DOCS_MISSING_ID,
          relatedRegistryDocsDraftModule.id,
        ]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('data-testid="blog-related-docs-unavailable"');
    expect(html).toContain(BLOG_RELATED_DOCS_ALL_UNAVAILABLE_FALLBACK);
    expect(html).not.toContain("<a");
    expect(html).not.toContain(RELATED_REGISTRY_DOCS_MISSING_ID);
  });

  test("renders valid links and partial-unavailable status for mixed input", () => {
    const html = renderToStaticMarkup(
      <BlogRelatedDocs
        relatedDocIds={[
          RELATED_REGISTRY_DOCS_MISSING_ID,
          relatedRegistryDocsGqa.id,
          relatedRegistryDocsDraftModule.id,
        ]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("Grouped Query Attention");
    expect(html).toContain(
      'data-testid="blog-related-docs-partial-unavailable"',
    );
    expect(html).toContain(BLOG_RELATED_DOCS_PARTIAL_UNAVAILABLE_STATUS);
    expect(html).not.toContain(RELATED_REGISTRY_DOCS_MISSING_ID);
    expect(html).not.toContain("Draft attention");
  });

  test("exposes accessible list semantics for available links", () => {
    render(
      <BlogRelatedDocs
        relatedDocIds={[relatedRegistryDocsMqa.id, relatedRegistryDocsGqa.id]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Multi-Query Attention" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Grouped Query Attention" }),
    ).toBeTruthy();
  });
});
