import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry } from "./registry";
import {
  citationRecordSchema,
  conceptRecordSchema,
  moduleRecordSchema,
  tagRecordSchema,
} from "./schemas";

const registryRoot = join(import.meta.dir, "../../content/registry");

async function readRegistryJson<T>(
  relativePath: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): Promise<T> {
  const raw = await readFile(join(registryRoot, relativePath), "utf8");
  const parsed = schema.safeParse(JSON.parse(raw));
  expect(parsed.success).toBe(true);
  return parsed.data as T;
}

describe("Phase 1 baseline registry records", () => {
  test("multi-head-latent-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/multi-head-latent-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.multi-head-latent-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.tags).toContain("kv-cache");
    expect(module.variantGroup).toBe("attention-head-sharing");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.citationIds).toContain("citation.deepseek-v2-mla-paper");
    expect(module.relatedIds).toContain("module.multi-head-attention");
    expect(module.relatedIds).toContain("module.multi-query-attention");
    expect(module.relatedIds).toContain("module.grouped-query-attention");
    expect(module.optimizes.length).toBeGreaterThan(0);
    expect(module.practicalBenefits.length).toBeGreaterThan(0);
  });

  test("linear-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/linear-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.linear-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.variantGroup).toBe("subquadratic-attention");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.citationIds).toContain(
      "citation.katharopoulos-linear-attention-paper",
    );
    expect(module.relatedIds).toContain("module.multi-head-attention");
    expect(module.relatedIds).toContain("module.multi-query-attention");
    expect(module.relatedIds).toContain("module.grouped-query-attention");
    expect(module.optimizes.length).toBeGreaterThan(0);
    expect(module.practicalBenefits.length).toBeGreaterThan(0);
  });

  test("sliding-window-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/sliding-window-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.sliding-window-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.tags).toContain("context-window");
    expect(module.variantGroup).toBe("attention-locality");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.relatedIds).toContain("module.multi-head-attention");
    expect(module.relatedIds).toContain("module.multi-query-attention");
    expect(module.relatedIds).toContain("module.grouped-query-attention");
    expect(module.optimizes.length).toBeGreaterThan(0);
    expect(module.practicalBenefits.length).toBeGreaterThan(0);
  });

  test("sparse-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/sparse-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.sparse-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.variantGroup).toBe("sparse-patterns");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.relatedIds).toContain("module.multi-head-attention");
    expect(module.relatedIds).toContain("module.multi-query-attention");
    expect(module.relatedIds).toContain("module.grouped-query-attention");
    expect(module.optimizes.length).toBeGreaterThan(0);
    expect(module.practicalBenefits.length).toBeGreaterThan(0);
  });

  test("grouped-query-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/grouped-query-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.grouped-query-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.tags).toContain("kv-cache");
    expect(module.variantGroup).toBe("attention-head-sharing");
    expect(module.citationIds).toContain("citation.gqa-paper");
    expect(module.optimizes.length).toBeGreaterThan(0);
    expect(module.practicalBenefits.length).toBeGreaterThan(0);
  });

  test("bidirectional-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/bidirectional-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.bidirectional-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toEqual(["attention"]);
    expect(module.aliases).toEqual(
      expect.arrayContaining([
        "bidirectional attention",
        "bidirectional self-attention",
        "full-context attention",
        "full context attention",
      ]),
    );
    expect(module.variantGroup).toBe("attention-mask-patterns");
    expect(module.conceptType).toBe("attention-variant");
    expect(module.relatedIds).toEqual([
      "module.attention",
      "module.multi-head-attention",
      "module.grouped-query-attention",
      "concept.encoder",
      "concept.encoder-decoder",
      "concept.transformer",
    ]);
    expect(module.citationIds).toContain("citation.attention-is-all-you-need");
    expect(module.optimizes.length).toBeGreaterThan(0);
    expect(module.practicalBenefits.length).toBeGreaterThan(0);
  });

  test("attention tag JSON passes tagRecordSchema", async () => {
    const tag = await readRegistryJson("tags/attention.json", tagRecordSchema);

    expect(tag.id).toBe("tag.attention");
    expect(tag.kind).toBe("tag");
    expect(tag.category).toBe("module-type");
    expect(tag.aliases.length).toBeGreaterThan(0);
  });

  test("token concept JSON passes conceptRecordSchema", async () => {
    const concept = await readRegistryJson(
      "concepts/token.json",
      conceptRecordSchema,
    );

    expect(concept.id).toBe("concept.token");
    expect(concept.kind).toBe("concept");
    expect(concept.conceptType).toBe("architecture");
    expect(concept.tags).toContain("attention");
    expect(concept.status).toBe("published");
  });

  test("kv-cache tag JSON passes tagRecordSchema", async () => {
    const tag = await readRegistryJson("tags/kv-cache.json", tagRecordSchema);

    expect(tag.id).toBe("tag.kv-cache");
    expect(tag.slug).toBe("kv-cache");
    expect(tag.parentTagId).toBe("tag.attention");
  });

  test("gqa-paper citation JSON passes citationRecordSchema", async () => {
    const citation = await readRegistryJson(
      "citations/gqa-paper.json",
      citationRecordSchema,
    );

    expect(citation.id).toBe("citation.gqa-paper");
    expect(citation.kind).toBe("citation");
    expect(citation.status).toBe("published");
    expect(citation.authors.length).toBeGreaterThan(0);
    expect(citation.title.length).toBeGreaterThan(0);
    expect(citation.url).toMatch(/^https:\/\//);
    expect(citation.mla.length).toBeGreaterThan(0);
  });

  test("Phase 1 starter records cross-reference via loadRegistry", async () => {
    const indexes = await loadRegistry();

    const module = indexes.byId.get("module.grouped-query-attention");
    expect(module?.kind).toBe("module");

    const concept = indexes.byId.get("concept.token");
    expect(concept?.kind).toBe("concept");
    expect(indexes.bySlug.get("token")?.id).toBe("concept.token");

    for (const tagRef of module?.tags ?? []) {
      expect(resolveTag(indexes, tagRef)).toBeDefined();
    }
    for (const citationId of module?.citationIds ?? []) {
      expect(indexes.byId.get(citationId)?.kind).toBe("citation");
    }
    for (const tagRef of concept?.tags ?? []) {
      expect(resolveTag(indexes, tagRef)).toBeDefined();
    }
  });
});

function resolveTag(
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
  tagRef: string,
): { id: string } | undefined {
  const bySlug = indexes.bySlug.get(tagRef);
  if (bySlug?.kind === "tag") {
    return bySlug;
  }
  const tagId = tagRef.startsWith("tag.") ? tagRef : `tag.${tagRef}`;
  const byId = indexes.byId.get(tagId);
  if (byId?.kind === "tag") {
    return byId;
  }
  return indexes.tagsBySlug.get(tagRef);
}
