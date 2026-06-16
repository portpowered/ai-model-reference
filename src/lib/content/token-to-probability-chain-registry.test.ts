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

const CHAIN_TAG_SLUG = "token-to-probability-chain" as const;

const CHAIN_CONCEPT_IDS = [
  "concept.token",
  "concept.embedding",
  "concept.tensor",
  "concept.logit",
  "concept.softmax",
  "concept.entropy",
  "concept.temperature",
  "concept.parameter",
  "concept.activation",
  "concept.computational-graph",
  "concept.gradient",
  "concept.backpropagation",
  "concept.loss-function",
  "concept.optimizer-state",
] as const;

const FORWARD_LEARNING_PATH = [
  "concept.token",
  "concept.embedding",
  "concept.tensor",
  "concept.logit",
  "concept.softmax",
] as const;

const ALLOWED_CHAIN_CONCEPT_TYPES = new Set([
  "general",
  "math",
  "architecture",
]);

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

describe("Phase 2 token-to-probability chain registry (US-001)", () => {
  test("chain discovery tag passes tagRecordSchema", async () => {
    const tag = await readRegistryJson(
      `tags/${CHAIN_TAG_SLUG}.json`,
      tagRecordSchema,
    );
    expect(tag.id).toBe(`tag.${CHAIN_TAG_SLUG}`);
    expect(tag.kind).toBe("tag");
    expect(tag.status).toBe("published");
    expect(tag.parentTagId).toBe("tag.foundations");
  });

  test("fourteen chain concepts pass conceptRecordSchema with chain tag and conceptType", async () => {
    for (const id of CHAIN_CONCEPT_IDS) {
      const slug = id.replace("concept.", "");
      const concept = await readRegistryJson(
        `concepts/${slug}.json`,
        conceptRecordSchema,
      );
      expect(concept.id).toBe(id);
      expect(concept.kind).toBe("concept");
      expect(concept.tags).toContain(CHAIN_TAG_SLUG);
      expect(ALLOWED_CHAIN_CONCEPT_TYPES.has(concept.conceptType)).toBe(true);
    }
  });

  test("forward learning order token → embedding → tensor → logit → softmax is explicit", async () => {
    const indexes = await loadRegistry();

    for (let index = 0; index < FORWARD_LEARNING_PATH.length - 1; index += 1) {
      const currentId = FORWARD_LEARNING_PATH[index];
      const nextId = FORWARD_LEARNING_PATH[index + 1];
      const current = indexes.byId.get(currentId) as ConceptRecord | undefined;
      const next = indexes.byId.get(nextId) as ConceptRecord | undefined;

      expect(current?.relatedIds).toContain(nextId);
      expect(next?.prerequisiteIds).toContain(currentId);
    }
  });

  test("chain concepts resolve tags and relationship fields via loadRegistry", async () => {
    const indexes = await loadRegistry();

    for (const id of CHAIN_CONCEPT_IDS) {
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
  });

  test("registry validation passes with chain tag and concept records", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });
});
