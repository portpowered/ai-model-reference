import { describe, expect, test } from "bun:test";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "@/lib/content/content-paths";
import {
  getPublishedDocsHrefForRecord,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry, type RegistryRecord } from "@/lib/content/registry";
import {
  getPrimaryClassificationForRecord,
  getRegistryRecordById,
  listClassificationMembers,
  listOntologyRelationshipsForRecord,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import type {
  ConceptRecord,
  DatasetRecord,
  ModelRecord,
  ModuleRecord,
  PaperRecord,
  SystemRecord,
  TrainingRegimeRecord,
} from "@/lib/content/schemas";
import { validateRegistryContent } from "@/lib/content/validate-registry";

type OntologySeedRecord =
  | ConceptRecord
  | DatasetRecord
  | ModelRecord
  | ModuleRecord
  | PaperRecord
  | SystemRecord
  | TrainingRegimeRecord;

const seededPrimaryClassifications = new Map([
  ["concept.activation", "classification.activation-functions"],
  ["module.relu", "classification.activation-functions"],
  ["module.attention", "classification.attention-mechanisms"],
  ["module.feed-forward-network", "classification.feed-forward-networks"],
  ["module.mixture-of-experts", "classification.feed-forward-networks"],
  ["module.layer-norm", "classification.normalization-layers"],
  ["module.rope", "classification.position-encoding-methods"],
  ["module.bpe", "classification.tokenization-methods"],
  [
    "module.manifold-constrained-hyper-connections",
    "classification.transformer-block-structures",
  ],
]);

const seededPublishedRoutes = new Map([
  ["concept.activation", "/docs/glossary/activation"],
  ["module.sigmoid", "/docs/modules/sigmoid"],
  ["module.tanh", "/docs/modules/tanh"],
  ["module.gelu", "/docs/modules/gelu"],
  ["module.relu", "/docs/modules/relu"],
  ["module.leaky-relu", "/docs/modules/leaky-relu"],
  ["module.silu", "/docs/modules/silu"],
  ["module.swiglu", "/docs/modules/swiglu"],
  ["module.standard-ffn", "/docs/modules/standard-ffn"],
  ["module.feed-forward-network", "/docs/modules/feed-forward-network"],
]);

async function createTempRegistryRoot(): Promise<{
  registryRoot: string;
  tempRoot: string;
}> {
  const tempRoot = join(
    import.meta.dir,
    "__ontology-foundation-fixtures__",
    crypto.randomUUID(),
  );
  const registryRoot = join(tempRoot, "registry");
  await mkdir(tempRoot, { recursive: true });
  await cp(join(getProjectRoot(), "src", "content", "registry"), registryRoot, {
    recursive: true,
  });
  return { registryRoot, tempRoot };
}

async function updateTempRegistryRecord(
  registryRoot: string,
  relativePath: string,
  transform: (record: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> {
  const filePath = join(registryRoot, relativePath);
  const record = JSON.parse(await readFile(filePath, "utf8")) as Record<
    string,
    unknown
  >;
  await writeFile(filePath, `${JSON.stringify(transform(record), null, 2)}\n`);
}

function expectSeedRecord(
  record: RegistryRecord | undefined,
  registryId: string,
): asserts record is OntologySeedRecord {
  expect(record?.id).toBe(registryId);
  if (
    !record ||
    (record.kind !== "concept" &&
      record.kind !== "dataset" &&
      record.kind !== "model" &&
      record.kind !== "module" &&
      record.kind !== "paper" &&
      record.kind !== "system" &&
      record.kind !== "training-regime")
  ) {
    throw new Error(`Expected ${registryId} to be an ontology seed record`);
  }
}

describe("ontology foundation regression coverage", () => {
  test("committed registry validation accepts the classification schema and seeded ontology references", async () => {
    await expect(validateRegistryContent()).resolves.toEqual([]);
  });

  test("validation fails when a participating activation record drops its primary classification", async () => {
    const { registryRoot, tempRoot } = await createTempRegistryRoot();
    try {
      await updateTempRegistryRecord(
        registryRoot,
        "modules/sigmoid.json",
        (record) => {
          const { primaryClassificationId: _ignored, ...rest } = record;
          return rest;
        },
      );

      const errors = await validateRegistryContent({ registryRoot });
      expect(
        errors.some(
          (error) =>
            error.code === "parse-error" &&
            error.path?.includes("modules/sigmoid.json") &&
            error.message.includes(
              "primaryClassificationId is required when a record opts into ontology membership or relationships",
            ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("validation fails when a participating activation record repeats its primary classification as a secondary classification", async () => {
    const { registryRoot, tempRoot } = await createTempRegistryRoot();
    try {
      await updateTempRegistryRecord(
        registryRoot,
        "modules/tanh.json",
        (record) => ({
          ...record,
          secondaryClassificationIds: [
            "classification.activation-functions",
            "classification.feed-forward-networks",
            "classification.feed-forward-networks",
          ],
        }),
      );

      const errors = await validateRegistryContent({ registryRoot });
      expect(
        errors.some(
          (error) =>
            error.code === "parse-error" &&
            error.path?.includes("modules/tanh.json") &&
            error.message.includes(
              "secondaryClassificationIds must not repeat the primary classification or contain duplicates",
            ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("validation fails when a participating activation record points at a missing relationship target", async () => {
    const { registryRoot, tempRoot } = await createTempRegistryRoot();
    try {
      await updateTempRegistryRecord(
        registryRoot,
        "modules/gelu.json",
        (record) => ({
          ...record,
          relationships: [
            {
              relationshipType: "used-by",
              targetId: "module.missing-feed-forward-target",
            },
          ],
        }),
      );

      const errors = await validateRegistryContent({ registryRoot });
      expect(
        errors.some(
          (error) =>
            error.code === "parse-error" &&
            error.path?.includes("modules/gelu.json") &&
            error.message.includes(
              'relationships targetId references missing record "module.missing-feed-forward-target"',
            ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("loader validates seeded classification membership and typed relationship targets", async () => {
    const indexes = await loadRegistry();
    const activationClassification = indexes.classificationsById.get(
      "classification.activation-functions",
    );
    const feedForwardClassification = indexes.classificationsById.get(
      "classification.feed-forward-networks",
    );

    expect(activationClassification?.classificationType).toBe("family");
    expect(activationClassification?.classifiesKinds).toEqual(
      expect.arrayContaining(["concept", "module"]),
    );
    expect(activationClassification?.classifiesKinds).toHaveLength(2);
    expect(feedForwardClassification?.parentClassificationId).toBe(
      "classification.neural-network-components",
    );
    expect(
      indexes.classificationsById.get(
        feedForwardClassification?.parentClassificationId ?? "",
      )?.classificationType,
    ).toBe("domain");
    expect(
      indexes.classificationsById.get("classification.attention-mechanisms")
        ?.classificationType,
    ).toBe("family");
    expect(
      indexes.classificationsById.get("classification.normalization-layers")
        ?.classificationType,
    ).toBe("family");
    expect(
      indexes.classificationsById.get(
        "classification.position-encoding-methods",
      )?.classificationType,
    ).toBe("family");
    expect(
      indexes.classificationsById.get("classification.tokenization-methods")
        ?.classificationType,
    ).toBe("family");
    expect(
      indexes.classificationsById.get(
        "classification.transformer-block-structures",
      )?.classificationType,
    ).toBe("topology");

    for (const [
      registryId,
      primaryClassificationId,
    ] of seededPrimaryClassifications) {
      const record = indexes.byId.get(registryId);
      expectSeedRecord(record, registryId);
      expect(record.primaryClassificationId).toBe(primaryClassificationId);
      const primary = record.primaryClassificationId;
      if (!primary) {
        throw new Error(
          `Expected ${registryId} to declare a primary classification`,
        );
      }

      const classificationIds = [
        primary,
        ...(record.secondaryClassificationIds ?? []),
      ];
      expect(new Set(classificationIds).size).toBe(classificationIds.length);
      for (const classificationId of classificationIds) {
        expect(indexes.classificationsById.has(classificationId)).toBe(true);
      }

      for (const relationship of record.relationships ?? []) {
        expect(indexes.byId.get(relationship.targetId)?.id).toBe(
          relationship.targetId,
        );
      }
    }
  });

  test("runtime helpers query the activation and feed-forward seed slice by classification and relationship type", () => {
    expect(getPrimaryClassificationForRecord("module.relu")?.id).toBe(
      "classification.activation-functions",
    );
    expect(getPrimaryClassificationForRecord("module.attention")?.id).toBe(
      "classification.attention-mechanisms",
    );
    expect(getPrimaryClassificationForRecord("module.swiglu")?.id).toBe(
      "classification.feed-forward-networks",
    );
    expect(getPrimaryClassificationForRecord("module.layer-norm")?.id).toBe(
      "classification.normalization-layers",
    );
    expect(getPrimaryClassificationForRecord("module.rope")?.id).toBe(
      "classification.position-encoding-methods",
    );
    expect(getPrimaryClassificationForRecord("module.bpe")?.id).toBe(
      "classification.tokenization-methods",
    );

    expect(
      listClassificationMembers("classification.activation-functions").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:concept.activation",
        "primary:module.relu",
      ]),
    );
    expect(
      listClassificationMembers("classification.feed-forward-networks").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:module.feed-forward-network",
        "primary:module.standard-ffn",
        "primary:module.swiglu",
        "primary:module.mixture-of-experts",
        "primary:module.deepseekmoe",
      ]),
    );
    expect(
      listClassificationMembers("classification.attention-mechanisms").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:module.attention",
        "primary:module.causal-attention",
        "primary:module.grouped-query-attention",
      ]),
    );
    expect(
      listClassificationMembers("classification.normalization-layers").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:module.layer-norm",
        "primary:module.rmsnorm",
      ]),
    );
    expect(
      listClassificationMembers("classification.position-encoding-methods").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining(["primary:module.rope", "primary:module.alibi"]),
    );
    expect(
      listClassificationMembers("classification.tokenization-methods").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:module.bpe",
        "primary:module.wordpiece",
      ]),
    );
    expect(
      listClassificationMembers(
        "classification.transformer-block-structures",
      ).map((member) => `${member.membershipType}:${member.record.id}`),
    ).toEqual(["primary:module.manifold-constrained-hyper-connections"]);

    const swiglu = getRegistryRecordById("module.swiglu");
    expectSeedRecord(swiglu, "module.swiglu");
    expect(swiglu.secondaryClassificationIds ?? []).not.toEqual(
      expect.arrayContaining([
        "classification.transformer-feed-forward-components",
      ]),
    );

    expect(
      listOntologyRelationshipsForRecord("module.standard-ffn", "uses").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["concept.activation"]);
    expect(
      listOntologyRelationshipsForRecord("module.sigmoid", "used-by").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["module.standard-ffn"]);
    expect(
      listOntologyRelationshipsForRecord("module.tanh", "used-by").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["module.standard-ffn"]);
    expect(
      listOntologyRelationshipsForRecord("module.gelu", "used-by").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["module.standard-ffn"]);
    expect(
      listOntologyRelationshipsForRecord("module.relu", "used-by").map(
        (relationship) => relationship.target?.id,
      ),
    ).toEqual(["module.standard-ffn"]);
    expect(
      listOntologyRelationshipsForRecord(
        "module.feed-forward-network",
        "part-of",
      ).map((relationship) => relationship.target?.id),
    ).toEqual(["classification.neural-network-components"]);
  });

  test("every published module now participates in a supported ontology classification", async () => {
    const indexes = await loadRegistry();
    const modules = [...indexes.byId.values()].filter(
      (record): record is ModuleRecord =>
        record.kind === "module" && record.status === "published",
    );

    expect(modules.length).toBeGreaterThan(0);
    for (const moduleRecord of modules) {
      expect(moduleRecord.primaryClassificationId).toBeDefined();
      expect(
        indexes.classificationsById.has(
          moduleRecord.primaryClassificationId ?? "",
        ),
      ).toBe(true);
    }
  });

  test("seeded ontology records preserve tag, curated related, and published route compatibility", () => {
    for (const [registryId, expectedHref] of seededPublishedRoutes) {
      const record = getRegistryRecordById(registryId);
      expect(record?.id).toBe(registryId);
      if (!record) {
        throw new Error(`Expected runtime record for ${registryId}`);
      }
      expect(getPublishedDocsHrefForRecord(record)).toBe(expectedHref);
    }

    const relu = getRegistryRecordById("module.relu");
    const sigmoid = getRegistryRecordById("module.sigmoid");
    const tanh = getRegistryRecordById("module.tanh");
    const gelu = getRegistryRecordById("module.gelu");
    const swiglu = getRegistryRecordById("module.swiglu");
    const activation = getRegistryRecordById("concept.activation");
    expect(relu?.tags).toEqual(["activation", "foundations"]);
    expect(sigmoid?.tags).toEqual(["activation", "foundations"]);
    expect(tanh?.tags).toEqual(["activation", "foundations"]);
    expect(gelu?.tags).toEqual(["activation", "foundations"]);
    expect(swiglu?.tags).toEqual(["feed-forward", "foundations"]);
    expect(activation?.tags).toEqual([
      "token-to-probability-chain",
      "foundations",
    ]);

    if (!relu || !sigmoid || !tanh || !gelu || !swiglu) {
      throw new Error("Expected seeded runtime records for curated links");
    }

    expect(
      deriveCuratedRelatedItems(
        relu,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ).map((item) => item.registryId),
    ).toEqual(
      expect.arrayContaining([
        "concept.activation",
        "module.feed-forward-network",
        "module.standard-ffn",
      ]),
    );
    expect(
      deriveCuratedRelatedItems(
        sigmoid,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ).map((item) => item.href),
    ).toEqual(
      expect.arrayContaining([
        "/docs/glossary/activation",
        "/docs/modules/feed-forward-network",
        "/docs/modules/standard-ffn",
        "/docs/modules/relu",
        "/docs/modules/silu",
      ]),
    );
    expect(
      deriveCuratedRelatedItems(
        tanh,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ).map((item) => item.href),
    ).toEqual(
      expect.arrayContaining([
        "/docs/glossary/activation",
        "/docs/modules/feed-forward-network",
        "/docs/modules/standard-ffn",
        "/docs/modules/sigmoid",
        "/docs/modules/relu",
      ]),
    );
    expect(
      deriveCuratedRelatedItems(
        gelu,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ).map((item) => item.href),
    ).toEqual(
      expect.arrayContaining([
        "/docs/glossary/activation",
        "/docs/modules/feed-forward-network",
        "/docs/modules/standard-ffn",
        "/docs/modules/relu",
        "/docs/modules/silu",
        "/docs/modules/swiglu",
      ]),
    );
    expect(
      deriveCuratedRelatedItems(
        swiglu,
        listRelatedRegistryRecords(),
        PUBLISHED_DOCS_REGISTRY_IDS,
      ).map((item) => item.href),
    ).toEqual(
      expect.arrayContaining([
        "/docs/modules/feed-forward-network",
        "/docs/modules/standard-ffn",
        "/docs/modules/silu",
        "/docs/glossary/activation",
      ]),
    );
  });
});
