import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RegistryComparisonTable } from "@/features/models/components/RegistryComparisonTable";
import { parsePageAssetConfig, resolveAssetText } from "@/lib/content/assets";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { pageMessagesSchema } from "@/lib/content/schemas";

const groupedQueryAttentionPageDir = getDocsPageDir(
  "modules",
  "grouped-query-attention",
);

const messages = pageMessagesSchema.parse(
  JSON.parse(
    readFileSync(
      join(groupedQueryAttentionPageDir, "messages/en.json"),
      "utf8",
    ),
  ),
);

const assets = parsePageAssetConfig(
  JSON.parse(
    readFileSync(join(groupedQueryAttentionPageDir, "assets.json"), "utf8"),
  ),
);

const comparisonAsset = assets.comparisonTable;
if (comparisonAsset.type !== "table") {
  throw new Error("Expected comparisonTable asset to be a table");
}

const caption = resolveAssetText(messages, comparisonAsset).caption;

describe("RegistryComparisonTable", () => {
  test("renders registry-backed comparison markers for the GQA fixture", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryComparisonTable
            assetId="comparisonTable"
            tableId={comparisonAsset.tableId}
            caption={caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-page-asset="comparisonTable"');
    expect(html).toContain(
      'data-table-id="table.grouped-query-attention-comparison"',
    );
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain('data-rich-content-scroll="table"');
    expect(html).not.toContain(">table.grouped-query-attention-comparison<");
    expect(html).toContain("Key-value head count");
    expect(html).toContain("Query-head flexibility");
    expect(html).toContain("Cache footprint per token");
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain("G key heads and G value heads");
    expect(html).toContain("single shared ");
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain("key-value cache");
  });

  test("localizes shipped docs column links for Vietnamese pages", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} locale="vi" isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryComparisonTable
            assetId="comparisonTable"
            tableId={comparisonAsset.tableId}
            caption={caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('href="/vi/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/vi/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/vi/docs/modules/grouped-query-attention"');
    expect(html).not.toContain('href="/docs/modules/multi-head-attention"');
    expect(html).not.toContain('href="/docs/modules/multi-query-attention"');
    expect(html).not.toContain('href="/docs/modules/grouped-query-attention"');
  });

  test("renders a missing table record marker when tableId is unknown", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={messages} isDev={false}>
        <PageAssetsProvider assets={assets} isDev={false}>
          <RegistryComparisonTable
            assetId="comparisonTable"
            tableId="table.missing-fixture"
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain('data-missing-table-record="table.missing-fixture"');
    expect(html).toContain("Missing table record: table.missing-fixture");
  });
});
