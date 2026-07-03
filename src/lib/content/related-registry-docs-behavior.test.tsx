import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BlogRelatedDocs } from "@/features/blog/components/BlogRelatedDocs";
import {
  DEFAULT_RELATED_REGISTRY_DOCS_ALL_UNAVAILABLE_FALLBACK,
  DEFAULT_RELATED_REGISTRY_DOCS_EMPTY_FALLBACK,
  RelatedRegistryDocs,
} from "@/features/docs/components/RelatedRegistryDocs";
import { resolveRelatedRegistryDocs } from "@/lib/content/related-registry-docs";
import {
  RELATED_REGISTRY_DOCS_MISSING_ID,
  relatedRegistryDocsDraftModule,
  relatedRegistryDocsGqa,
  relatedRegistryDocsMqa,
  relatedRegistryDocsResolveOptions,
  relatedRegistryDocsUnindexedModule,
} from "@/lib/content/related-registry-docs.test-fixtures";

function countAnchors(html: string): number {
  return (html.match(/<a[\s>]/g) ?? []).length;
}

describe("related registry docs behavior", () => {
  test("valid published ids resolve to link-ready items and render titled hrefs", () => {
    const resolved = resolveRelatedRegistryDocs(
      [relatedRegistryDocsMqa.id, relatedRegistryDocsGqa.id],
      relatedRegistryDocsResolveOptions,
    );

    expect(resolved.unavailable).toEqual([]);
    expect(resolved.available).toEqual([
      {
        registryId: relatedRegistryDocsMqa.id,
        title: "Multi-Query Attention",
        href: "/docs/modules/multi-query-attention",
      },
      {
        registryId: relatedRegistryDocsGqa.id,
        title: "Grouped Query Attention",
        href: "/docs/modules/grouped-query-attention",
      },
    ]);

    const componentHtml = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[relatedRegistryDocsMqa.id, relatedRegistryDocsGqa.id]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );
    const blogHtml = renderToStaticMarkup(
      <BlogRelatedDocs
        relatedDocIds={[relatedRegistryDocsMqa.id, relatedRegistryDocsGqa.id]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    for (const html of [componentHtml, blogHtml]) {
      expect(html).toContain('href="/docs/modules/multi-query-attention"');
      expect(html).toContain('href="/docs/modules/grouped-query-attention"');
      expect(html).toContain("Multi-Query Attention");
      expect(html).toContain("Grouped Query Attention");
      expect(html).not.toContain(relatedRegistryDocsMqa.id);
      expect(countAnchors(html)).toBe(2);
    }
  });

  test("missing ids stay unavailable and render fallback without anchors", () => {
    const resolved = resolveRelatedRegistryDocs(
      [RELATED_REGISTRY_DOCS_MISSING_ID, relatedRegistryDocsGqa.id],
      relatedRegistryDocsResolveOptions,
    );

    expect(resolved.available).toHaveLength(1);
    expect(resolved.unavailable).toEqual([
      { registryId: RELATED_REGISTRY_DOCS_MISSING_ID, reason: "missing" },
    ]);

    const allMissingHtml = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[RELATED_REGISTRY_DOCS_MISSING_ID]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(allMissingHtml).toContain(
      'data-testid="related-registry-docs-unavailable"',
    );
    expect(allMissingHtml).toContain(
      DEFAULT_RELATED_REGISTRY_DOCS_ALL_UNAVAILABLE_FALLBACK,
    );
    expect(allMissingHtml).not.toContain(RELATED_REGISTRY_DOCS_MISSING_ID);
    expect(countAnchors(allMissingHtml)).toBe(0);
  });

  test("unpublished and docs-page-less records stay unavailable without reader hrefs", () => {
    const resolved = resolveRelatedRegistryDocs(
      [
        relatedRegistryDocsDraftModule.id,
        relatedRegistryDocsUnindexedModule.id,
        relatedRegistryDocsGqa.id,
      ],
      relatedRegistryDocsResolveOptions,
    );

    expect(resolved.available).toEqual([
      {
        registryId: relatedRegistryDocsGqa.id,
        title: "Grouped Query Attention",
        href: "/docs/modules/grouped-query-attention",
      },
    ]);
    expect(resolved.unavailable).toEqual([
      {
        registryId: relatedRegistryDocsDraftModule.id,
        reason: "unpublished",
      },
      {
        registryId: relatedRegistryDocsUnindexedModule.id,
        reason: "unpublished",
      },
    ]);

    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[
          relatedRegistryDocsDraftModule.id,
          relatedRegistryDocsUnindexedModule.id,
        ]}
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('data-testid="related-registry-docs-unavailable"');
    expect(html).not.toContain(relatedRegistryDocsDraftModule.id);
    expect(html).not.toContain(relatedRegistryDocsUnindexedModule.id);
    expect(countAnchors(html)).toBe(0);
  });

  test("empty related docs render configured empty fallback without anchors", () => {
    const resolved = resolveRelatedRegistryDocs(
      [],
      relatedRegistryDocsResolveOptions,
    );

    expect(resolved.available).toEqual([]);
    expect(resolved.unavailable).toEqual([]);

    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[]}
        emptyFallback="No related docs configured."
        resolveOptions={relatedRegistryDocsResolveOptions}
      />,
    );

    expect(html).toContain('data-testid="related-registry-docs-empty"');
    expect(html).toContain("No related docs configured.");
    expect(html).not.toContain(DEFAULT_RELATED_REGISTRY_DOCS_EMPTY_FALLBACK);
    expect(countAnchors(html)).toBe(0);
  });
});
