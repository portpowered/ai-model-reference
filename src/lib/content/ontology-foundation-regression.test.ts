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
  ["concept.activation", "classification.concept.architecture.activation"],
  ["module.relu", "classification.module.activation"],
  ["module.attention", "classification.module.attention"],
  ["module.feed-forward-network", "classification.module.feed-forward"],
  ["module.mixture-of-experts", "classification.module.feed-forward"],
  ["module.layer-norm", "classification.module.normalization"],
  ["module.rope", "classification.module.positional-encoding"],
  ["module.bpe", "classification.module.tokenization"],
  [
    "module.manifold-constrained-hyper-connections",
    "classification.module.transformer-block",
  ],
  ["training-regime.dpo", "classification.training.alignment"],
  ["training-regime.grpo", "classification.training.alignment"],
  ["training-regime.pretraining", "classification.training.pretraining"],
  ["system.routing", "classification.system.routing"],
]);

const seededPublishedRoutes = new Map([
  ["concept.activation", "/docs/concepts/activation"],
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

const provingSliceWithoutTypedTaxonomy = [
  "module.feed-forward-network",
  "module.standard-ffn",
  "module.mixture-of-experts",
  "module.deepseekmoe",
  "module.swiglu",
  "module.relu",
  "module.gelu",
  "module.silu",
  "module.sigmoid",
  "module.tanh",
  "module.leaky-relu",
  "concept.activation",
] as const;

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
              'record "module.sigmoid" requires primaryClassificationId under the ontology-first taxonomy contract',
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
            "classification.module.feed-forward",
            "classification.module.feed-forward",
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

  test("validation fails when a migrated concept record drops its required primary classification", async () => {
    const { registryRoot, tempRoot } = await createTempRegistryRoot();
    try {
      await updateTempRegistryRecord(
        registryRoot,
        "concepts/activation.json",
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
            error.path?.includes("concepts/activation.json") &&
            error.message.includes(
              'record "concept.activation" requires primaryClassificationId under the ontology-first taxonomy contract',
            ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("validation fails when a module classification conflicts with the legacy taxonomy field bridge", async () => {
    const { registryRoot, tempRoot } = await createTempRegistryRoot();
    try {
      await updateTempRegistryRecord(
        registryRoot,
        "modules/relu.json",
        (record) => ({
          ...record,
          moduleType: "activation",
          primaryClassificationId: "classification.module.feed-forward",
        }),
      );

      const errors = await validateRegistryContent({ registryRoot });
      expect(
        errors.some(
          (error) =>
            error.code === "parse-error" &&
            error.path?.includes("modules/relu.json") &&
            error.message.includes(
              'primaryClassificationId "classification.module.feed-forward" conflicts with legacy taxonomy field moduleType="activation"; expected "feed-forward"',
            ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("validation fails when a secondary classification points at the wrong ontology kind", async () => {
    const { registryRoot, tempRoot } = await createTempRegistryRoot();
    try {
      await updateTempRegistryRecord(
        registryRoot,
        "modules/grouped-query-attention.json",
        (record) => ({
          ...record,
          secondaryClassificationIds: ["classification.concept.architecture"],
        }),
      );

      const errors = await validateRegistryContent({ registryRoot });
      expect(
        errors.some(
          (error) =>
            error.code === "parse-error" &&
            error.path?.includes("modules/grouped-query-attention.json") &&
            error.message.includes(
              'secondaryClassificationIds entry "classification.concept.architecture" cannot classify module records',
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
      "classification.module.activation",
    );
    const feedForwardClassification = indexes.classificationsById.get(
      "classification.module.feed-forward",
    );

    expect(activationClassification?.classificationType).toBe("family");
    expect(activationClassification?.classifiesKinds).toEqual(["module"]);
    expect(feedForwardClassification?.parentClassificationId).toBe(
      "classification.module",
    );
    expect(
      indexes.classificationsById.get(
        feedForwardClassification?.parentClassificationId ?? "",
      )?.classificationType,
    ).toBe("domain");
    expect(
      indexes.classificationsById.get("classification.module.attention")
        ?.classificationType,
    ).toBe("family");
    expect(
      indexes.classificationsById.get("classification.module.normalization")
        ?.classificationType,
    ).toBe("family");
    expect(
      indexes.classificationsById.get(
        "classification.module.positional-encoding",
      )?.classificationType,
    ).toBe("family");
    expect(
      indexes.classificationsById.get("classification.module.tokenization")
        ?.classificationType,
    ).toBe("family");
    expect(
      indexes.classificationsById.get("classification.module.transformer-block")
        ?.classificationType,
    ).toBe("topology");
    expect(
      indexes.classificationsById.get("classification.concept.architecture")
        ?.parentClassificationId,
    ).toBe("classification.concept");
    expect(
      indexes.classificationsById.get("classification.training.alignment")
        ?.parentClassificationId,
    ).toBe("classification.training");
    expect(
      indexes.classificationsById.get("classification.system.routing")
        ?.parentClassificationId,
    ).toBe("classification.system");

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
      "classification.module.activation",
    );
    expect(getPrimaryClassificationForRecord("module.attention")?.id).toBe(
      "classification.module.attention",
    );
    expect(getPrimaryClassificationForRecord("module.swiglu")?.id).toBe(
      "classification.module.feed-forward",
    );
    expect(getPrimaryClassificationForRecord("module.layer-norm")?.id).toBe(
      "classification.module.normalization",
    );
    expect(getPrimaryClassificationForRecord("module.rope")?.id).toBe(
      "classification.module.positional-encoding",
    );
    expect(getPrimaryClassificationForRecord("module.bpe")?.id).toBe(
      "classification.module.tokenization",
    );
    expect(getPrimaryClassificationForRecord("concept.activation")?.id).toBe(
      "classification.concept.architecture.activation",
    );
    expect(getPrimaryClassificationForRecord("training-regime.dpo")?.id).toBe(
      "classification.training.alignment",
    );
    expect(
      getPrimaryClassificationForRecord("training-regime.instruction-tuning")
        ?.id,
    ).toBe("classification.training.alignment");
    expect(
      getPrimaryClassificationForRecord("training-regime.pretraining")?.id,
    ).toBe("classification.training.pretraining");
    expect(getPrimaryClassificationForRecord("system.routing")?.id).toBe(
      "classification.system.routing",
    );

    expect(
      listClassificationMembers("classification.module.activation").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(expect.arrayContaining(["primary:module.relu"]));
    expect(
      listClassificationMembers("classification.module.feed-forward").map(
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
      listClassificationMembers("classification.module.attention").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:module.attention",
        "primary:module.causal-attention",
      ]),
    );
    expect(
      listClassificationMembers("classification.module.attention", {
        includeSecondary: true,
      }).map((member) => `${member.membershipType}:${member.record.id}`),
    ).toEqual(
      expect.arrayContaining([
        "secondary:module.multi-head-attention",
        "secondary:module.grouped-query-attention",
      ]),
    );
    expect(
      listClassificationMembers("classification.module.normalization").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:module.layer-norm",
        "primary:module.rmsnorm",
      ]),
    );
    expect(
      listClassificationMembers(
        "classification.module.positional-encoding",
      ).map((member) => `${member.membershipType}:${member.record.id}`),
    ).toEqual(
      expect.arrayContaining(["primary:module.rope", "primary:module.alibi"]),
    );
    expect(
      listClassificationMembers("classification.module.tokenization").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:module.bpe",
        "primary:module.wordpiece",
      ]),
    );
    expect(
      listClassificationMembers("classification.module.transformer-block").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:module.diffusion-transformer-block",
        "primary:module.manifold-constrained-hyper-connections",
      ]),
    );
    expect(
      listClassificationMembers(
        "classification.concept.architecture.activation",
      ).map((member) => `${member.membershipType}:${member.record.id}`),
    ).toEqual(["primary:concept.activation"]);
    expect(
      listClassificationMembers("classification.training.alignment").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:training-regime.dpo",
        "primary:training-regime.grpo",
        "primary:training-regime.instruction-tuning",
      ]),
    );
    expect(
      listClassificationMembers("classification.training.pretraining").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:training-regime.pretraining",
        "primary:training-regime.diffusion-training-objective",
      ]),
    );
    expect(
      listClassificationMembers("classification.system.routing").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(["primary:system.routing"]);

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
    ).toEqual(["classification.module"]);
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
        "/docs/concepts/activation",
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
        "/docs/concepts/activation",
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
        "/docs/concepts/activation",
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
        "/docs/concepts/activation",
      ]),
    );
  });

  test("activation and feed-forward proving records no longer depend on deprecated typed-taxonomy fields", () => {
    for (const registryId of provingSliceWithoutTypedTaxonomy) {
      const record = getRegistryRecordById(registryId);
      expectSeedRecord(record, registryId);
      expect(record).not.toHaveProperty("moduleType");
      expect(record).not.toHaveProperty("moduleFamily");
      expect(record).not.toHaveProperty("conceptType");
      expect(record).not.toHaveProperty("variantGroup");
      expect(record).not.toHaveProperty("sidebarGrouping");
      expect(record.primaryClassificationId).toBeDefined();
    }
  });
});
