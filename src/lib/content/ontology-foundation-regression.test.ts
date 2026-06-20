import { describe, expect, test } from "bun:test";
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
import { validateRegistryContent } from "@/lib/content/validate-registry";

type OntologySeedRecord = Extract<
  RegistryRecord,
  {
    primaryClassificationId?: string;
    secondaryClassificationIds?: string[];
    relationships?: Array<{ relationshipType: string; targetId: string }>;
  }
>;

const seededPrimaryClassifications = new Map([
  ["concept.activation", "classification.activation-functions"],
  ["module.sigmoid", "classification.activation-functions"],
  ["module.tanh", "classification.activation-functions"],
  ["module.relu", "classification.activation-functions"],
  ["module.leaky-relu", "classification.activation-functions"],
  ["module.silu", "classification.activation-functions"],
  ["module.swiglu", "classification.feed-forward-networks"],
  ["module.standard-ffn", "classification.feed-forward-networks"],
  ["module.feed-forward-network", "classification.feed-forward-networks"],
]);

const seededPublishedRoutes = new Map([
  ["concept.activation", "/docs/glossary/activation"],
  ["module.sigmoid", "/docs/modules/sigmoid"],
  ["module.tanh", "/docs/modules/tanh"],
  ["module.relu", "/docs/modules/relu"],
  ["module.leaky-relu", "/docs/modules/leaky-relu"],
  ["module.silu", "/docs/modules/silu"],
  ["module.swiglu", "/docs/modules/swiglu"],
  ["module.standard-ffn", "/docs/modules/standard-ffn"],
  ["module.feed-forward-network", "/docs/modules/feed-forward-network"],
]);

function expectSeedRecord(
  record: RegistryRecord | undefined,
  registryId: string,
): asserts record is OntologySeedRecord {
  expect(record?.id).toBe(registryId);
  if (!record || !("primaryClassificationId" in record)) {
    throw new Error(`Expected ${registryId} to be an ontology seed record`);
  }
}

describe("ontology foundation regression coverage", () => {
  test("committed registry validation accepts the classification schema and seeded ontology references", async () => {
    await expect(validateRegistryContent()).resolves.toEqual([]);
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
    expect(getPrimaryClassificationForRecord("module.sigmoid")?.id).toBe(
      "classification.activation-functions",
    );
    expect(getPrimaryClassificationForRecord("module.tanh")?.id).toBe(
      "classification.activation-functions",
    );
    expect(getPrimaryClassificationForRecord("module.relu")?.id).toBe(
      "classification.activation-functions",
    );
    expect(getPrimaryClassificationForRecord("module.swiglu")?.id).toBe(
      "classification.feed-forward-networks",
    );

    expect(
      listClassificationMembers("classification.activation-functions").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "primary:concept.activation",
        "primary:module.sigmoid",
        "primary:module.tanh",
        "primary:module.relu",
        "primary:module.leaky-relu",
        "primary:module.silu",
      ]),
    );
    expect(
      listClassificationMembers("classification.feed-forward-networks").map(
        (member) => `${member.membershipType}:${member.record.id}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        "secondary:module.sigmoid",
        "secondary:module.tanh",
        "primary:module.feed-forward-network",
        "primary:module.standard-ffn",
        "primary:module.swiglu",
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
    const swiglu = getRegistryRecordById("module.swiglu");
    const activation = getRegistryRecordById("concept.activation");
    expect(relu?.tags).toEqual(["activation", "foundations"]);
    expect(sigmoid?.tags).toEqual(["activation", "foundations"]);
    expect(tanh?.tags).toEqual(["activation", "foundations"]);
    expect(swiglu?.tags).toEqual(["feed-forward", "foundations"]);
    expect(activation?.tags).toEqual([
      "token-to-probability-chain",
      "foundations",
    ]);

    if (!relu || !sigmoid || !tanh || !swiglu) {
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
