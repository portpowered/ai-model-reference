import { describe, expect, test } from "bun:test";
import {
  deriveRelatedDocGroups,
  deriveSameVariantGroupPeers,
  moduleDisplayTitle,
  modulePageHref,
  SAME_VARIANT_GROUP,
} from "@/lib/content/related-docs";
import type { ModuleRecord } from "@/lib/content/schemas";

const gqa: ModuleRecord = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  kind: "module",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["GQA"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  moduleType: "attention",
  variantGroup: "attention-head-sharing",
  optimizes: [],
  practicalBenefits: [],
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
  aliases: ["MQA"],
  variantGroup: "attention-head-sharing",
};

const mha: ModuleRecord = {
  ...gqa,
  id: "module.multi-head-attention",
  slug: "multi-head-attention",
  aliases: ["MHA"],
  variantGroup: "attention-head-sharing",
};

const sparse: ModuleRecord = {
  ...gqa,
  id: "module.sparse-attention",
  slug: "sparse-attention",
  aliases: ["Sparse attention"],
  variantGroup: "sparse-patterns",
};

describe("related-docs", () => {
  test("modulePageHref builds canonical module docs paths", () => {
    expect(modulePageHref("grouped-query-attention")).toBe(
      "/docs/modules/grouped-query-attention",
    );
  });

  test("deriveSameVariantGroupPeers selects peers and excludes self", () => {
    const peers = deriveSameVariantGroupPeers(gqa, [gqa, mqa, mha, sparse]);
    expect(peers.map((item) => item.registryId)).toEqual([
      "module.multi-head-attention",
      "module.multi-query-attention",
    ]);
    expect(
      peers.every((item) => item.reasonLabel === "Same variant group"),
    ).toBe(true);
  });

  test("deriveSameVariantGroupPeers returns empty when source has no variantGroup", () => {
    const noGroup = { ...gqa, variantGroup: undefined };
    expect(deriveSameVariantGroupPeers(noGroup, [mqa, mha])).toEqual([]);
  });

  test("deriveRelatedDocGroups omits empty groups and ignores unsupported ids", () => {
    const groups = deriveRelatedDocGroups(
      gqa,
      [gqa, mqa, mha],
      [SAME_VARIANT_GROUP, "same-concept-type", "shared-tags"],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe(SAME_VARIANT_GROUP);
    expect(groups[0]?.items).toHaveLength(2);
  });

  test("deriveRelatedDocGroups returns nothing when no peers match", () => {
    expect(deriveRelatedDocGroups(gqa, [gqa], [SAME_VARIANT_GROUP])).toEqual(
      [],
    );
  });

  test("moduleDisplayTitle prefers the first alias", () => {
    expect(moduleDisplayTitle(gqa)).toBe("GQA");
  });
});
