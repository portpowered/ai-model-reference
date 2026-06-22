import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  deriveCuratedRelatedItems,
  type RelatedRegistryRecord,
} from "@/lib/content/related-docs";
import { type ConceptRecord, conceptRecordSchema } from "@/lib/content/schemas";
import { validateRegistryContent } from "@/lib/content/validate-registry";

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

describe("special tokens registry record", () => {
  test("publishes the glossary concept with tokenizer aliases and prerequisite metadata", async () => {
    const record = await readRegistryJson(
      "concepts/special-tokens.json",
      conceptRecordSchema,
    );

    expect(record.id).toBe("concept.special-tokens");
    expect(record.kind).toBe("concept");
    expect(record.status).toBe("published");
    expect(record.conceptType).toBe("general");
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "special token",
        "control token",
        "BOS token",
        "EOS token",
      ]),
    );
    expect(record.tags).toEqual(["tokenization", "foundations"]);
    expect(record.sidebarGrouping).toEqual({
      glossary: "sequence-and-attention",
    });
    expect(record.prerequisiteIds).toEqual(["concept.token"]);
    expect(record.relatedIds).toEqual([
      "concept.token",
      "concept.tokenizers-overview",
      "module.bpe",
      "module.wordpiece",
      "module.sentencepiece",
      "concept.conditioning",
      "concept.prefill",
      "model.gpt-3",
    ]);
  });

  test("resolves all related targets through the registry", async () => {
    const indexes = await loadRegistry();
    const record = indexes.byId.get("concept.special-tokens");

    expect(record?.kind).toBe("concept");
    const concept = record as ConceptRecord | undefined;
    for (const id of concept?.relatedIds ?? []) {
      expect(indexes.byId.has(id)).toBe(true);
    }
    for (const id of concept?.prerequisiteIds ?? []) {
      expect(indexes.byId.has(id)).toBe(true);
    }
  });

  test("curated related links bridge tokenization, prompting, and representative model pages", async () => {
    const indexes = await loadRegistry();
    const source = indexes.byId.get("concept.special-tokens") as
      | ConceptRecord
      | undefined;
    if (!source) {
      throw new Error("expected concept.special-tokens in registry");
    }

    const candidates = Array.from(indexes.byId.values()).filter(
      (record): record is RelatedRegistryRecord =>
        record.kind !== "tag" &&
        record.kind !== "citation" &&
        record.kind !== "graph",
    );

    const items = deriveCuratedRelatedItems(
      source,
      candidates,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const token = items.find((item) => item.registryId === "concept.token");
    expect(token?.href).toBe("/docs/glossary/token");

    const bpe = items.find((item) => item.registryId === "module.bpe");
    expect(bpe?.href).toBe("/docs/modules/bpe");

    const conditioning = items.find(
      (item) => item.registryId === "concept.conditioning",
    );
    expect(conditioning?.href).toBe("/docs/glossary/conditioning");

    const prefill = items.find((item) => item.registryId === "concept.prefill");
    expect(prefill?.href).toBe("/docs/concepts/prefill");

    const gpt3 = items.find((item) => item.registryId === "model.gpt-3");
    expect(gpt3?.href).toBe("/docs/models/gpt-3");

    const tokenizersOverview = items.find(
      (item) => item.registryId === "concept.tokenizers-overview",
    );
    expect(tokenizersOverview?.href).toBe("/docs/concepts/tokenizers-overview");

    const wordpiece = items.find(
      (item) => item.registryId === "module.wordpiece",
    );
    expect(wordpiece?.href).toBe("/docs/modules/wordpiece");

    const sentencepiece = items.find(
      (item) => item.registryId === "module.sentencepiece",
    );
    expect(sentencepiece?.href).toBe("/docs/modules/sentencepiece");
  });

  test("registry validation accepts the special-tokens record", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });
});
