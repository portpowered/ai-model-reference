import { describe, expect, test } from "bun:test";
import {
  buildFoundationPathInventory,
  FORWARD_LEARNING_PATH_REGISTRY_IDS,
  FOUNDATION_PATH_INVENTORY_SLUGS,
  FOUNDATION_PATH_OUT_OF_SCOPE_WORK,
  formatFoundationPathInventoryReport,
  TARGET_PATH_REGISTRY_IDS,
} from "./phase-2-token-probability-path-inventory";

function rowForSlug(
  inventory: Awaited<ReturnType<typeof buildFoundationPathInventory>>,
  slug: (typeof FOUNDATION_PATH_INVENTORY_SLUGS)[number],
) {
  const row = inventory.rows.find((entry) => entry.slug === slug);
  if (!row) {
    throw new Error(`missing inventory row for ${slug}`);
  }
  return row;
}

describe("Phase 2 token-probability path foundation inventory (phase-2-token-probability-path-convergence-001)", () => {
  test("inventory covers all fourteen foundation slugs", async () => {
    const inventory = await buildFoundationPathInventory();

    expect(inventory.rows).toHaveLength(FOUNDATION_PATH_INVENTORY_SLUGS.length);
    expect(inventory.rows.map((row) => row.slug)).toEqual([
      ...FOUNDATION_PATH_INVENTORY_SLUGS,
    ]);
  });

  test("each row records route, bundle, registry, tags, related docs, search, and page-spec status", async () => {
    const inventory = await buildFoundationPathInventory();

    for (const row of inventory.rows) {
      expect(row.registryId).toBe(`concept.${row.slug}`);
      expect(row.canonicalRoute).toBe(`/docs/glossary/${row.slug}`);
      expect(typeof row.assets.publishedRoute).toBe("boolean");
      expect(typeof row.assets.pageBundle).toBe("boolean");
      expect(typeof row.assets.registryRecord).toBe("boolean");
      expect(typeof row.assets.tags).toBe("boolean");
      expect(typeof row.assets.relatedDocs).toBe("boolean");
      expect(typeof row.assets.searchDocument).toBe("boolean");
      expect(typeof row.assets.pageSpecWorkflowOutput).toBe("boolean");
    }
  });

  test("target path pages publish glossary routes with registry, tags, and search documents", async () => {
    const inventory = await buildFoundationPathInventory();

    for (const registryId of TARGET_PATH_REGISTRY_IDS) {
      const slug = registryId.replace(
        "concept.",
        "",
      ) as (typeof FOUNDATION_PATH_INVENTORY_SLUGS)[number];
      const row = rowForSlug(inventory, slug);

      expect(row.assets.pageBundle).toBe(true);
      expect(row.assets.registryRecord).toBe(true);
      expect(row.assets.tags).toBe(true);
      expect(row.assets.relatedDocs).toBe(true);
      expect(row.assets.searchDocument).toBe(true);
      expect(row.assets.publishedRoute).toBe(true);
      expect(row.assets.pageSpecWorkflowOutput).toBe(false);
    }
  });

  test("forward learning chain pages publish without blocking route defects", async () => {
    const inventory = await buildFoundationPathInventory();

    for (const registryId of FORWARD_LEARNING_PATH_REGISTRY_IDS) {
      const slug = registryId.replace(
        "concept.",
        "",
      ) as (typeof FOUNDATION_PATH_INVENTORY_SLUGS)[number];
      const row = rowForSlug(inventory, slug);

      expect(row.assets.publishedRoute).toBe(true);
      expect(row.inScopeRepairs).not.toContain("route");
    }
  });

  test("token row no longer marks logit and softmax curated related docs as repairs", async () => {
    const inventory = await buildFoundationPathInventory();
    const token = rowForSlug(inventory, "token");

    expect(token.inScopeRepairs).not.toContain("token-to-logit");
    expect(token.inScopeRepairs).not.toContain("token-to-softmax");
    expect(token.inScopeRepairs).not.toContain("token-to-embedding");
    expect(token.inScopeRepairs).not.toContain("route");
    expect(token.inScopeRepairs).not.toContain("search-facet");
  });

  test("supporting foundation pages do not widen repairs when the forward chain already publishes", async () => {
    const inventory = await buildFoundationPathInventory();
    const tensor = rowForSlug(inventory, "tensor");

    expect(tensor.assets.publishedRoute).toBe(true);
    expect(tensor.inScopeRepairs).toEqual([]);
  });

  test("inventory explicitly marks phase 3, localization, model-family, and rewrite work out of scope", async () => {
    const inventory = await buildFoundationPathInventory();

    expect(inventory.outOfScopeWork).toEqual(FOUNDATION_PATH_OUT_OF_SCOPE_WORK);
    expect(inventory.outOfScopeWork.map((entry) => entry.category)).toEqual([
      "phase-3-transformer-component-expansion",
      "localization-implementation",
      "model-family-pages",
      "broad-content-rewrite",
    ]);
  });

  test("formatted inventory report lists rows and out-of-scope categories", async () => {
    const inventory = await buildFoundationPathInventory();
    const report = formatFoundationPathInventoryReport(inventory);

    expect(report).toContain(
      "Phase 2 token-to-probability foundation path inventory",
    );
    expect(report).toContain("phase-3-transformer-component-expansion");
    expect(report).toContain("/docs/glossary/token");
    expect(report).toContain("token (/docs/glossary/token)");
  });
});
