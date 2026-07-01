import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import { loadRegistry } from "./registry";
import {
  baseRecordSchema,
  citationRecordSchema,
  classificationRecordSchema,
  conceptRecordSchema,
  datasetRecordSchema,
  graphRecordSchema,
  modelRecordSchema,
  moduleRecordSchema,
  organizationRecordSchema,
  paperRecordSchema,
  registryRecordSchema,
  systemRecordSchema,
  tagRecordSchema,
  trainingRegimeRecordSchema,
} from "./schemas";

const registryRoot = join(import.meta.dir, "../../content/registry");

const validBaseFields = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["GQA"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: ["citation.gqa-paper"],
  status: "published" as const,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
};

type ParseSchema = z.ZodTypeAny;

async function expectFixtureParses(
  relativePath: string,
  schema: ParseSchema,
): Promise<z.infer<ParseSchema>> {
  const raw = await readFile(join(registryRoot, relativePath), "utf8");
  const parsed = schema.safeParse(JSON.parse(raw));
  expect(parsed.success).toBe(true);
  if (!parsed.success) {
    throw new Error(`fixture ${relativePath} failed to parse`);
  }
  return parsed.data;
}

const publishedFixtureCases = [
  {
    kind: "module",
    path: "modules/grouped-query-attention.json",
    schema: moduleRecordSchema,
  },
  {
    kind: "tag",
    path: "tags/attention.json",
    schema: tagRecordSchema,
  },
  {
    kind: "citation",
    path: "citations/gqa-paper.json",
    schema: citationRecordSchema,
  },
  {
    kind: "concept",
    path: "concepts/token.json",
    schema: conceptRecordSchema,
  },
  {
    kind: "classification",
    path: "classifications/attention-mechanisms.json",
    schema: classificationRecordSchema,
  },
  {
    kind: "model",
    path: "models/gpt-3.json",
    schema: modelRecordSchema,
  },
  {
    kind: "paper",
    path: "papers/gpt-2-report.json",
    schema: paperRecordSchema,
  },
  {
    kind: "training-regime",
    path: "training-regimes/pretraining.json",
    schema: trainingRegimeRecordSchema,
  },
  {
    kind: "system",
    path: "systems/inference-engine.json",
    schema: systemRecordSchema,
  },
  {
    kind: "dataset",
    path: "datasets/deepseek-v4-specialist-corpus.json",
    schema: datasetRecordSchema,
  },
  {
    kind: "organization",
    path: "organizations/deepseek-ai.json",
    schema: organizationRecordSchema,
  },
  {
    kind: "graph",
    path: "graphs/token-concept-map.json",
    schema: graphRecordSchema,
  },
] as const;

describe("AI-domain registry validation unchanged after core type split", () => {
  describe("published fixture records parse through existing schemas.ts exports", () => {
    for (const fixture of publishedFixtureCases) {
      test(`${fixture.kind} fixture ${fixture.path} parses successfully`, async () => {
        const record = await expectFixtureParses(fixture.path, fixture.schema);
        expect(record.kind).toBe(fixture.kind);
      });
    }

    test("registry union accepts representative fixture records", async () => {
      const tag = await expectFixtureParses(
        "tags/attention.json",
        registryRecordSchema,
      );
      expect(tag.kind).toBe("tag");

      const module = await expectFixtureParses(
        "modules/grouped-query-attention.json",
        registryRecordSchema,
      );
      expect(module.kind).toBe("module");
    });
  });

  describe("rejection behavior preserved through schemas.ts exports", () => {
    test("rejects incomplete base records", () => {
      const result = baseRecordSchema.safeParse({
        id: "module.incomplete",
        kind: "module",
      });
      expect(result.success).toBe(false);
    });

    test("rejects incomplete module records", () => {
      const result = moduleRecordSchema.safeParse({
        ...validBaseFields,
        kind: "module",
        optimizes: ["kv-cache"],
        mathLevel: "none",
      });
      expect(result.success).toBe(false);
    });

    test("rejects malformed ontology relationships on module records", () => {
      const result = moduleRecordSchema.safeParse({
        ...validBaseFields,
        kind: "module",
        moduleType: "activation",
        optimizes: ["activation-sparsity"],
        exampleModelIds: [],
        improvesOnIds: [],
        tradeoffIds: [],
        usedByModelIds: [],
        introducedByPaperIds: [],
        mathLevel: "none",
        relationships: [
          {
            relationshipType: "uses",
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    test("rejects invalid classification records missing required fields", () => {
      const result = classificationRecordSchema.safeParse({
        ...validBaseFields,
        id: "classification.module.activation",
        slug: "activation-functions",
        kind: "classification",
        classifiesKinds: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loadRegistry indexes published representative records unchanged", () => {
    test("indexes module, tag, citation, concept, classification, model, paper, training-regime, system, and graph entries by id and slug", async () => {
      const indexes = await loadRegistry();

      const representativeEntries = [
        {
          id: "module.grouped-query-attention",
          slug: "grouped-query-attention",
          kind: "module",
        },
        { id: "tag.attention", slug: "attention", kind: "tag" },
        { id: "citation.gqa-paper", slug: "gqa-paper", kind: "citation" },
        { id: "concept.token", slug: "token", kind: "concept" },
        {
          id: "classification.module.attention",
          slug: "attention-mechanisms",
          kind: "classification",
        },
        { id: "model.gpt-3", slug: "gpt-3", kind: "model" },
        { id: "paper.deepseek-v4", slug: "deepseek-v4", kind: "paper" },
        {
          id: "training-regime.pretraining",
          slug: "pretraining",
          kind: "training-regime",
        },
        {
          id: "system.inference-engine",
          slug: "inference-engine",
          kind: "system",
        },
        {
          id: "graph.token-concept-map",
          slug: "token-concept-map",
          kind: "graph",
        },
      ] as const;

      for (const entry of representativeEntries) {
        const byId = indexes.byId.get(entry.id);
        expect(byId?.kind).toBe(entry.kind);
        expect(indexes.bySlug.get(entry.slug)?.id).toBe(entry.id);
      }

      expect(indexes.byId.get("paper.gpt-2-report")?.kind).toBe("paper");
    });
  });
});
