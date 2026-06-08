import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry } from "./registry";
import {
  type ConceptRecord,
  conceptRecordSchema,
  tagRecordSchema,
} from "./schemas";
import { validateRegistryContent } from "./validate-registry";

const registryRoot = join(import.meta.dir, "../../content/registry");

const DRAFT_FORWARD_TARGET_IDS = [
  "concept.transformer",
  "concept.diffusion-model",
  "concept.multimodal-model",
  "concept.world-model",
] as const;

const REMAINING_DRAFT_FORWARD_TARGET_IDS = [
  "concept.diffusion-model",
  "concept.multimodal-model",
  "concept.world-model",
] as const;

const TAXONOMY_CONCEPT_IDS = [
  "concept.model",
  "concept.architecture",
  "concept.module",
  "concept.component",
  "concept.modality",
  "concept.foundation-model",
  "concept.generative-model",
  "concept.discriminative-model",
  "concept.representation",
] as const;

const TAXONOMY_TAG_SLUGS = ["taxonomy", "foundations", "model-family"] as const;

async function readRegistryJson<T>(
  relativePath: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): Promise<T> {
  const raw = await readFile(join(registryRoot, relativePath), "utf8");
  const parsed = schema.safeParse(JSON.parse(raw));
  expect(parsed.success).toBe(true);
  return parsed.data as T;
}

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
  return undefined;
}

describe("Phase 2 taxonomy registry (US-001)", () => {
  test("taxonomy discovery tags pass tagRecordSchema", async () => {
    for (const slug of TAXONOMY_TAG_SLUGS) {
      const tag = await readRegistryJson(`tags/${slug}.json`, tagRecordSchema);
      expect(tag.id).toBe(`tag.${slug}`);
      expect(tag.kind).toBe("tag");
      expect(tag.status).toBe("published");
    }

    const taxonomy = await readRegistryJson(
      "tags/taxonomy.json",
      tagRecordSchema,
    );
    expect(taxonomy.category).toBe("architecture");

    const foundations = await readRegistryJson(
      "tags/foundations.json",
      tagRecordSchema,
    );
    expect(foundations.parentTagId).toBe("tag.taxonomy");

    const modelFamily = await readRegistryJson(
      "tags/model-family.json",
      tagRecordSchema,
    );
    expect(modelFamily.category).toBe("model-family");
    expect(modelFamily.parentTagId).toBe("tag.taxonomy");
  });

  test("transformer forward target is published and remaining forward targets stay draft", async () => {
    const transformer = await readRegistryJson(
      "concepts/transformer.json",
      conceptRecordSchema,
    );
    expect(transformer.id).toBe("concept.transformer");
    expect(transformer.status).toBe("published");
    expect(transformer.conceptType).toBe("architecture");
    expect(transformer.tags).toContain("taxonomy");
    expect(transformer.tags).toContain("model-family");

    for (const id of REMAINING_DRAFT_FORWARD_TARGET_IDS) {
      const slug = id.replace("concept.", "");
      const concept = await readRegistryJson(
        `concepts/${slug}.json`,
        conceptRecordSchema,
      );
      expect(concept.id).toBe(id);
      expect(concept.kind).toBe("concept");
      expect(concept.status).toBe("draft");
      expect(concept.conceptType).toBe("architecture");
      expect(concept.tags).toContain("taxonomy");
      expect(concept.tags).toContain("model-family");
    }
  });

  test("draft forward targets resolve taxonomy tags via loadRegistry", async () => {
    const indexes = await loadRegistry();

    for (const id of DRAFT_FORWARD_TARGET_IDS) {
      const concept = indexes.byId.get(id) as ConceptRecord | undefined;
      expect(concept?.kind).toBe("concept");
      for (const tagRef of concept?.tags ?? []) {
        expect(resolveTag(indexes, tagRef)).toBeDefined();
      }
    }

    for (const slug of TAXONOMY_TAG_SLUGS) {
      expect(indexes.tagsBySlug.get(slug)?.id).toBe(`tag.${slug}`);
    }
  });

  test("registry validation passes with taxonomy tags and draft forward targets", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });
});

describe("Phase 2 taxonomy concept records (US-003)", () => {
  test("nine published taxonomy concepts pass conceptRecordSchema", async () => {
    for (const id of TAXONOMY_CONCEPT_IDS) {
      const slug = id.replace("concept.", "");
      const concept = await readRegistryJson(
        `concepts/${slug}.json`,
        conceptRecordSchema,
      );
      expect(concept.id).toBe(id);
      expect(concept.kind).toBe("concept");
      expect(concept.status).toBe("published");
      expect(concept.conceptType).toBe("general");
      expect(concept.tags).toContain("taxonomy");
      expect(concept.tags).toContain("foundations");
    }
  });

  test("architecture record references draft forward targets via relatedIds", async () => {
    const architecture = await readRegistryJson(
      "concepts/architecture.json",
      conceptRecordSchema,
    );
    for (const id of DRAFT_FORWARD_TARGET_IDS) {
      expect(architecture.relatedIds).toContain(id);
    }
    expect(architecture.prerequisiteIds).toContain("concept.model");
    expect(architecture.explainsIds).toEqual([
      "concept.module",
      "concept.component",
    ]);
  });

  test("taxonomy concepts resolve tags and relationship fields via loadRegistry", async () => {
    const indexes = await loadRegistry();

    for (const id of TAXONOMY_CONCEPT_IDS) {
      const concept = indexes.byId.get(id) as ConceptRecord | undefined;
      expect(concept?.kind).toBe("concept");
      for (const tagRef of concept?.tags ?? []) {
        expect(resolveTag(indexes, tagRef)).toBeDefined();
      }
      for (const refId of [
        ...(concept?.relatedIds ?? []),
        ...(concept?.prerequisiteIds ?? []),
        ...(concept?.explainsIds ?? []),
      ]) {
        expect(indexes.byId.has(refId)).toBe(true);
      }
    }

    const component = indexes.byId.get("concept.component") as
      | ConceptRecord
      | undefined;
    expect(component?.prerequisiteIds).toEqual(["concept.module"]);

    const generative = indexes.byId.get("concept.generative-model") as
      | ConceptRecord
      | undefined;
    expect(generative?.prerequisiteIds).toEqual([
      "concept.model",
      "concept.foundation-model",
    ]);
    expect(generative?.relatedIds).toContain("concept.discriminative-model");
  });

  test("registry validation passes with nine taxonomy concept records", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });
});
