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
import type { ModuleRecord } from "@/lib/content/schemas";

const TEST_PAGE_MESSAGES = {
  title: "Test page",
  description: "Test description",
};

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

describe("RelatedRegistryDocs", () => {
  test("renders compact published links with docs chrome styling", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[mqa.id, gqa.id]}
        resolveOptions={resolveOptions}
      />,
    );

    expect(html).toContain('data-testid="related-registry-docs"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain("Multi-Query Attention");
    expect(html).toContain("Grouped Query Attention");
    expect(html).toContain("no-underline");
    expect(html).toContain("focus-visible:ring-2");
    expect(html).not.toContain("module.multi-query-attention");
  });

  test("renders configured empty fallback when input is empty", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={[]}
        emptyFallback="No related docs configured."
        resolveOptions={resolveOptions}
      />,
    );

    expect(html).toContain('data-testid="related-registry-docs-empty"');
    expect(html).toContain("No related docs configured.");
    expect(html).not.toContain("<a");
  });

  test("renders all-unavailable fallback without broken anchors", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={["module.missing-runtime-record", draftModule.id]}
        resolveOptions={resolveOptions}
      />,
    );

    expect(html).toContain('data-testid="related-registry-docs-unavailable"');
    expect(html).toContain(
      DEFAULT_RELATED_REGISTRY_DOCS_ALL_UNAVAILABLE_FALLBACK,
    );
    expect(html).not.toContain("<a");
    expect(html).not.toContain("module.missing-runtime-record");
  });

  test("renders valid links and partial-unavailable status for mixed input", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs
        registryIds={["module.missing-runtime-record", gqa.id, draftModule.id]}
        resolveOptions={resolveOptions}
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
    expect(html).not.toContain("module.missing-runtime-record");
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
          registryIds={[gqa.id]}
          resolveOptions={resolveOptions}
        />
      </PageMessagesProvider>,
    );

    expect(html).toContain('href="/vi/docs/modules/grouped-query-attention"');
  });

  test("exposes accessible list semantics for available links", () => {
    render(
      <RelatedRegistryDocs
        registryIds={[mqa.id, gqa.id]}
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

  test("uses default empty fallback copy when none is configured", () => {
    const html = renderToStaticMarkup(
      <RelatedRegistryDocs registryIds={[]} resolveOptions={resolveOptions} />,
    );

    expect(html).toContain(DEFAULT_RELATED_REGISTRY_DOCS_EMPTY_FALLBACK);
  });
});
