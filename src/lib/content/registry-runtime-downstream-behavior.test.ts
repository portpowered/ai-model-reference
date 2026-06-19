import { describe, expect, test } from "bun:test";
import { buildPageReleaseMetadata } from "@/lib/content/page-release-metadata";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { resolvePublishedResourceTags } from "@/lib/content/phase-1-published-resources";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModuleById,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { source } from "@/lib/source";

function findPageByRegistryId(registryId: string) {
  const page = loadPublishedDocsPagesSync("en").find(
    (candidate) => candidate.frontmatter.registryId === registryId,
  );
  expect(page).toBeDefined();
  if (!page) {
    throw new Error(`expected published page for ${registryId}`);
  }
  return page;
}

describe("registry-runtime downstream behavior", () => {
  test("derived runtime continues to feed related docs, tags, and release metadata", async () => {
    const registryIndexes = await loadRegistry();
    const groupedQueryAttention = getModuleById(
      "module.grouped-query-attention",
    );
    expect(groupedQueryAttention).toBeDefined();
    if (!groupedQueryAttention) {
      throw new Error("expected grouped-query attention registry record");
    }

    const page = findPageByRegistryId(groupedQueryAttention.id);
    expect(resolvePublishedResourceTags(page, registryIndexes)).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );

    const curatedRelated = deriveCuratedRelatedItems(
      groupedQueryAttention,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(curatedRelated.map((item) => item.registryId)).toEqual(
      expect.arrayContaining([
        "module.multi-query-attention",
        "concept.kv-cache",
        "concept.prefill-decode-split",
      ]),
    );
    expect(
      curatedRelated.every((item) => item.href?.startsWith("/docs/")),
    ).toBe(true);

    const metadata = buildPageReleaseMetadata(groupedQueryAttention);
    expect(metadata).not.toBeNull();
    expect(metadata?.authors).toEqual(
      expect.arrayContaining(["Joshua Ainslie", "James Lee-Thorp"]),
    );
    expect(metadata?.dateLabel).toBe("Released");
    expect(metadata?.releaseDate).toBe("2023-05-01");
    expect(metadata?.source).toEqual({
      title:
        "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
      url: "https://arxiv.org/abs/2305.13245",
    });
  });

  test("derived runtime records still drive generated navigation for published pages", () => {
    const groupedQueryAttention = getRegistryRecordById(
      "module.grouped-query-attention",
    );
    expect(groupedQueryAttention?.kind).toBe("module");

    const modulesFolder = source.pageTree.children.find(
      (node) => node.type === "folder" && node.name === "Modules",
    );
    expect(modulesFolder?.type).toBe("folder");
    if (modulesFolder?.type !== "folder") {
      throw new Error("expected Modules folder in generated docs tree");
    }

    const attentionVariantsSeparator = modulesFolder.children.findIndex(
      (node) => node.type === "separator" && node.name === "Attention Variants",
    );
    const groupedQueryAttentionPage = modulesFolder.children.findIndex(
      (node) =>
        node.type === "page" &&
        "url" in node &&
        node.url === "/docs/modules/grouped-query-attention",
    );

    expect(attentionVariantsSeparator).toBeGreaterThanOrEqual(0);
    expect(groupedQueryAttentionPage).toBeGreaterThan(
      attentionVariantsSeparator,
    );
  });
});
