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

const registryRoot = join(import.meta.dir, "../../content/registry");

describe("tokenizers overview registry record", () => {
  test("publishes the tokenizer family concept with canonical discovery aliases", async () => {
    const raw = await readFile(
      join(registryRoot, "concepts/tokenizers-overview.json"),
      "utf8",
    );
    const parsed = conceptRecordSchema.safeParse(JSON.parse(raw));

    expect(parsed.success).toBe(true);
    const record = parsed.data as ConceptRecord;

    expect(record.id).toBe("concept.tokenizers-overview");
    expect(record.status).toBe("published");
    expect(record.tags).toEqual(["tokenization", "foundations"]);
    expect(record.aliases).toEqual(
      expect.arrayContaining([
        "tokenizer",
        "tokenizers",
        "tokenizer overview",
        "text tokenization",
        "how text becomes tokens",
      ]),
    );
    expect(record.relatedIds).toEqual([
      "concept.token",
      "concept.embedding",
      "concept.vocabulary-size",
      "concept.special-tokens",
      "module.bpe",
      "module.wordpiece",
      "module.sentencepiece",
      "module.byte-level-tokenization",
    ]);
  });

  test("curated related items preserve tokenizer-family navigation order", async () => {
    const indexes = await loadRegistry();
    const source = indexes.byId.get("concept.tokenizers-overview") as
      | ConceptRecord
      | undefined;
    if (!source) {
      throw new Error("expected concept.tokenizers-overview in registry");
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

    expect(items.map((item) => item.registryId)).toEqual(source.relatedIds);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/glossary/token",
      "/docs/glossary/embedding",
      "/docs/glossary/vocabulary-size",
      "/docs/glossary/special-tokens",
      "/docs/modules/bpe",
      undefined,
      "/docs/modules/sentencepiece",
      "/docs/modules/byte-level-tokenization",
    ]);
    expect(
      items.find((item) => item.registryId === "module.wordpiece")?.isPlanned,
    ).toBe(true);
    expect(
      items.find((item) => item.registryId === "concept.embedding")?.isPlanned,
    ).toBe(false);
  });
});
