import { describe, expect, test } from "bun:test";
import * as core from "./registry-core";
import {
  baseRecordSchema,
  citationRecordSchema,
  citationTypeSchema,
  classificationRecordSchema,
  classificationTypeSchema,
  datasetRecordSchema,
  generatedPageBundleRegistryRecordSchema,
  graphRecordSchema,
  modelRecordSchema,
  ontologyParticipantKindSchema,
  ontologyRelationshipSchema,
  ontologyRelationshipTypeSchema,
  organizationRecordSchema,
  paperRecordSchema,
  registryKindSchema,
  registryRecordSchema,
  registryStatusSchema,
  systemRecordSchema,
  tagCategorySchema,
  tagLandingPageSchema,
  tagRecordSchema,
  trainingRegimeRecordSchema,
} from "./schemas";

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

describe("schemas export compatibility", () => {
  test("re-exports core registry schemas from registry-core without duplication", () => {
    expect(baseRecordSchema).toBe(core.baseRecordSchema);
    expect(registryStatusSchema).toBe(core.registryStatusSchema);
    expect(registryKindSchema).toBe(core.registryKindSchema);
    expect(tagRecordSchema).toBe(core.tagRecordSchema);
    expect(tagCategorySchema).toBe(core.tagCategorySchema);
    expect(tagLandingPageSchema).toBe(core.tagLandingPageSchema);
    expect(citationRecordSchema).toBe(core.citationRecordSchema);
    expect(citationTypeSchema).toBe(core.citationTypeSchema);
    expect(classificationRecordSchema).toBe(core.classificationRecordSchema);
    expect(classificationTypeSchema).toBe(core.classificationTypeSchema);
    expect(ontologyParticipantKindSchema).toBe(
      core.ontologyParticipantKindSchema,
    );
    expect(ontologyRelationshipSchema).toBe(core.ontologyRelationshipSchema);
    expect(ontologyRelationshipTypeSchema).toBe(
      core.ontologyRelationshipTypeSchema,
    );
  });

  test("parses AI-domain records through the existing schema module exports", () => {
    expect(
      modelRecordSchema.safeParse({
        ...validBaseFields,
        id: "model.demo",
        slug: "demo",
        kind: "model",
        family: "demo",
        sourceType: "open-weights",
        modalities: ["text"],
        architectureIds: [],
        moduleIds: [],
        trainingRegimeIds: [],
        datasetIds: [],
        paperIds: [],
      }).success,
    ).toBe(true);

    expect(
      paperRecordSchema.safeParse({
        ...validBaseFields,
        id: "paper.demo",
        slug: "demo-paper",
        kind: "paper",
        authors: ["A. Author"],
        publishedAt: "2024-01-01",
        url: "https://example.com/paper",
        introducesIds: [],
        supportsIds: [],
        arguesAgainstIds: [],
        modelIds: [],
        moduleIds: [],
        conceptIds: [],
      }).success,
    ).toBe(true);

    expect(
      trainingRegimeRecordSchema.safeParse({
        ...validBaseFields,
        id: "training-regime.demo",
        slug: "demo-training",
        kind: "training-regime",
        usedByModelIds: [],
        relatedModuleIds: [],
        paperIds: [],
      }).success,
    ).toBe(true);

    expect(
      systemRecordSchema.safeParse({
        ...validBaseFields,
        id: "system.demo",
        slug: "demo-system",
        kind: "system",
        relatedModelIds: [],
        relatedModuleIds: [],
        relatedConceptIds: [],
        paperIds: [],
        datasetIds: [],
      }).success,
    ).toBe(true);

    expect(
      datasetRecordSchema.safeParse({
        ...validBaseFields,
        id: "dataset.demo",
        slug: "demo-dataset",
        kind: "dataset",
        usedByModelIds: [],
        paperIds: [],
      }).success,
    ).toBe(true);

    expect(
      organizationRecordSchema.safeParse({
        ...validBaseFields,
        id: "organization.demo",
        slug: "demo-org",
        kind: "organization",
        modelIds: [],
        paperIds: [],
        systemIds: [],
      }).success,
    ).toBe(true);

    expect(
      graphRecordSchema.safeParse({
        ...validBaseFields,
        id: "graph.demo",
        slug: "demo-graph",
        kind: "graph",
        subjectId: "module.grouped-query-attention",
        graphType: "module-compute-flow",
        rootNodeId: "node.root",
        layout: "vertical-expandable",
        defaultExpandedDepth: 1,
        supportedRenderers: ["react-flow"],
        nodes: [
          {
            id: "node.root",
            labelKey: "graph.nodes.root.label",
            moduleKind: "operation",
            childNodeIds: [],
          },
        ],
        edges: [],
      }).success,
    ).toBe(true);
  });

  test("keeps registry union and generated bundle schemas available from schemas.ts", () => {
    const moduleResult = registryRecordSchema.safeParse({
      ...validBaseFields,
      kind: "module",
      moduleType: "attention",
      optimizes: ["kv-cache"],
      exampleModelIds: [],
      improvesOnIds: [],
      tradeoffIds: [],
      usedByModelIds: [],
      introducedByPaperIds: [],
      mathLevel: "light",
    });
    expect(moduleResult.success).toBe(true);

    const bundleResult = generatedPageBundleRegistryRecordSchema.safeParse({
      ...validBaseFields,
      id: "concept.demo",
      slug: "demo-concept",
      kind: "concept",
      conceptType: "architecture",
      prerequisiteIds: [],
      explainsIds: [],
    });
    expect(bundleResult.success).toBe(true);
    if (bundleResult.success) {
      expect(bundleResult.data.kind).toBe("concept");
    }
  });
});
