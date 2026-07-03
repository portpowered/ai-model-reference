import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BLOG_RELATED_DOCS_ALL_UNAVAILABLE_FALLBACK,
  BLOG_RELATED_DOCS_EMPTY_FALLBACK,
  BLOG_RELATED_DOCS_PARTIAL_UNAVAILABLE_STATUS,
  BlogRelatedDocs,
} from "@/features/blog/components/BlogRelatedDocs";
import type { ModuleRecord } from "@/lib/content/schemas";

const publishedRegistryIds = new Set([
  "module.grouped-query-attention",
  "module.multi-query-attention",
]);

const gqa: ModuleRecord = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  kind: "module",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["Grouped Query Attention"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  moduleType: "attention",
  variantGroup: "attention-head-sharing",
  optimizes: [],
  exampleModelIds: [],
  improvesOnIds: [],
  tradeoffIds: [],
  usedByModelIds: [],
  introducedByPaperIds: [],
  mathLevel: "light",
};

const mqa: ModuleRecord = {
  ...gqa,
  id: "module.multi-query-attention",
  slug: "multi-query-attention",
  aliases: ["Multi-Query Attention"],
};

const draftModule: ModuleRecord = {
  ...gqa,
  id: "module.draft-attention",
  slug: "draft-attention",
  aliases: ["Draft attention"],
  status: "draft",
};

const recordsById = new Map<string, ModuleRecord>([
  [gqa.id, gqa],
  [mqa.id, mqa],
  [draftModule.id, draftModule],
]);

const resolveOptions = {
  publishedRegistryIds,
  getRecordById: (registryId: string) => recordsById.get(registryId),
};

afterEach(() => {
  cleanup();
});

describe("BlogRelatedDocs", () => {
  test("passes explicit relatedDocIds through to compact published links", () => {
    const html = renderToStaticMarkup(
      <BlogRelatedDocs
        relatedDocIds={[mqa.id, gqa.id]}
        resolveOptions={resolveOptions}
      />,
    );

    expect(html).toContain('data-testid="blog-related-docs"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("Multi-Query Attention");
    expect(html).toContain("Grouped Query Attention");
    expect(html).toContain("no-underline");
    expect(html).not.toContain("module.multi-query-attention");
  });

  test("renders blog empty fallback when relatedDocIds is empty", () => {
    const html = renderToStaticMarkup(
      <BlogRelatedDocs relatedDocIds={[]} resolveOptions={resolveOptions} />,
    );

    expect(html).toContain('data-testid="blog-related-docs-empty"');
    expect(html).toContain(BLOG_RELATED_DOCS_EMPTY_FALLBACK);
    expect(html).not.toContain("<a");
  });

  test("renders all-unavailable fallback without broken anchors", () => {
    const html = renderToStaticMarkup(
      <BlogRelatedDocs
        relatedDocIds={["module.missing-runtime-record", draftModule.id]}
        resolveOptions={resolveOptions}
      />,
    );

    expect(html).toContain('data-testid="blog-related-docs-unavailable"');
    expect(html).toContain(BLOG_RELATED_DOCS_ALL_UNAVAILABLE_FALLBACK);
    expect(html).not.toContain("<a");
    expect(html).not.toContain("module.missing-runtime-record");
  });

  test("renders valid links and partial-unavailable status for mixed input", () => {
    const html = renderToStaticMarkup(
      <BlogRelatedDocs
        relatedDocIds={[
          "module.missing-runtime-record",
          gqa.id,
          draftModule.id,
        ]}
        resolveOptions={resolveOptions}
      />,
    );

    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("Grouped Query Attention");
    expect(html).toContain(
      'data-testid="blog-related-docs-partial-unavailable"',
    );
    expect(html).toContain(BLOG_RELATED_DOCS_PARTIAL_UNAVAILABLE_STATUS);
    expect(html).not.toContain("module.missing-runtime-record");
    expect(html).not.toContain("Draft attention");
  });

  test("exposes accessible list semantics for available links", () => {
    render(
      <BlogRelatedDocs
        relatedDocIds={[mqa.id, gqa.id]}
        resolveOptions={resolveOptions}
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
