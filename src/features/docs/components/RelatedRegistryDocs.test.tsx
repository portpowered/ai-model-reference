import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import {
  DEFAULT_RELATED_REGISTRY_DOCS_ALL_UNAVAILABLE_FALLBACK,
  DEFAULT_RELATED_REGISTRY_DOCS_EMPTY_FALLBACK,
  DEFAULT_RELATED_REGISTRY_DOCS_PARTIAL_UNAVAILABLE_STATUS,
  RelatedRegistryDocs,
} from "@/features/docs/components/RelatedRegistryDocs";
import {
  RELATED_REGISTRY_DOCS_MISSING_ID,
  relatedRegistryDocsDraftModule,
  relatedRegistryDocsGqa,
  relatedRegistryDocsMqa,
  relatedRegistryDocsResolveOptions,
} from "@/lib/content/related-registry-docs.test-fixtures";

const TEST_PAGE_MESSAGES = {
  title: "Test page",
  description: "Test description",
};

afterEach(() => {
  cleanup();
});

describe("RelatedRegistryDocs", () => {
  test("renders compact published links with docs chrome styling", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[relatedRegistryDocsMqa.id, relatedRegistryDocsGqa.id]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('data-testid="related-registry-docs"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("Multi-Query Attention");
    expect(html).toContain("Grouped Query Attention");
    expect(html).toContain("no-underline");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).not.toContain(relatedRegistryDocsMqa.id);
  });

  test("renders configured empty fallback when input is empty", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[]}
        emptyFallback="No related docs configured."
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('data-testid="related-registry-docs-empty"');
    expect(html).toContain("No related docs configured.");
    expect(html).not.toContain("<a");
  });

  test("renders all-unavailable fallback without broken anchors", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[
          RELATED_REGISTRY_DOCS_MISSING_ID,
          relatedRegistryDocsDraftModule.id,
        ]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('data-testid="related-registry-docs-unavailable"');
    expect(html).toContain(
      DEFAULT_RELATED_REGISTRY_DOCS_ALL_UNAVAILABLE_FALLBACK,
    );
    expect(html).not.toContain("<a");
    expect(html).not.toContain(RELATED_REGISTRY_DOCS_MISSING_ID);
  });

  test("renders valid links and partial-unavailable status for mixed input", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[
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
      'data-testid="related-registry-docs-partial-unavailable"',
    );
    expect(html).toContain(
      DEFAULT_RELATED_REGISTRY_DOCS_PARTIAL_UNAVAILABLE_STATUS,
    );
    expect(html).not.toContain(RELATED_REGISTRY_DOCS_MISSING_ID);
    expect(html).not.toContain("Draft attention");
  });

  test("localizes shipped docs links from page context", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider
        messages={TEST_PAGE_MESSAGES}
        locale="vi"
        isDev={false}
      >
        <RelatedRegistryDocs
          registryIds={[relatedRegistryDocsGqa.id]}
          resolveOptions={relatedRegistryDocsResolveOptions}
        />
      </PageMessagesProvider>,
    );

    expect(html).toContain('href="/vi/docs/modules/grouped-query-attention"');
  });

  test("exposes accessible list semantics for available links", () => {
    render(
      <RelatedRegistryDocs
        registryIds={[relatedRegistryDocsMqa.id, relatedRegistryDocsGqa.id]}
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

  test("uses default empty fallback copy when none is configured", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain(DEFAULT_RELATED_REGISTRY_DOCS_EMPTY_FALLBACK);
  });
});
