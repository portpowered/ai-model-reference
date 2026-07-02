import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  getModelById,
  getModuleById,
  getOrganizationById,
  getPaperById,
  getSystemById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { validateRegistryContent } from "./validate-registry";

const MODEL_ID = "model.nemotron-3-super";

const TOUCHED_RECORD_IDS = [
  MODEL_ID,
  "paper.nemotron-3-super",
  "organization.nvidia",
  "module.mixture-of-experts",
  "module.mamba-selective-state-space",
  "concept.context-window",
  "system.routing",
  "system.inference-engine",
  "system.deployment",
] as const;

describe("nemotron 3 super registry relationships", () => {
  test("model record publishes source-backed metadata and discovery relationships", () => {
    const model = getModelById(MODEL_ID);

    expect(model?.status).toBe("published");
    expect(model?.slug).toBe("nemotron-3-super");
    expect(model?.organizationId).toBe("organization.nvidia");
    expect(model?.paperIds).toEqual(["paper.nemotron-3-super"]);
    expect(model?.moduleIds).toEqual([
      "module.mixture-of-experts",
      "module.mamba-selective-state-space",
    ]);
    expect(model?.architectureIds).toEqual([
      "concept.transformer-architecture",
      "concept.context-extension",
    ]);
    expect(model?.parameterCount).toBe("120 billion total parameters");
    expect(model?.activeParameterCount).toBe("12 billion active parameters");
    expect(model?.contextLength).toBe(1_048_576);
    expect(model?.precision).toEqual(["bf16", "nvfp4"]);
    expect(model?.tags).toEqual([
      "foundations",
      "model-family",
      "context-window",
      "quantization",
    ]);
    expect(model?.relatedIds).toEqual([
      "paper.nemotron-3-super",
      "organization.nvidia",
      "module.mixture-of-experts",
      "module.mamba-selective-state-space",
      "concept.context-window",
      "concept.context-extension",
      "concept.transformer-architecture",
      "concept.quantization",
      "system.routing",
      "system.inference-engine",
      "system.deployment",
    ]);
  });

  test("supporting records link back to the Nemotron 3 Super model page", () => {
    expect(getPaperById("paper.nemotron-3-super")?.relatedIds).toEqual([
      MODEL_ID,
    ]);
    expect(getPaperById("paper.nemotron-3-super")?.modelIds).toEqual([
      MODEL_ID,
    ]);
    expect(getOrganizationById("organization.nvidia")?.modelIds).toEqual([
      MODEL_ID,
    ]);
    expect(getOrganizationById("organization.nvidia")?.systemIds).toEqual([
      "system.inference-engine",
      "system.deployment",
    ]);
    expect(
      getModuleById("module.mixture-of-experts")?.usedByModelIds,
    ).toContain(MODEL_ID);
    expect(getModuleById("module.mixture-of-experts")?.exampleModelIds).toEqual(
      [MODEL_ID],
    );
    expect(getConceptById("concept.context-window")?.relatedIds).toContain(
      MODEL_ID,
    );
    expect(getSystemById("system.routing")?.relatedModelIds).toContain(
      MODEL_ID,
    );
    expect(getSystemById("system.inference-engine")?.relatedModelIds).toContain(
      MODEL_ID,
    );
    expect(getSystemById("system.deployment")?.relatedModelIds).toContain(
      MODEL_ID,
    );
  });

  test("curated related items resolve to published MoE, routing, serving, and context pages", () => {
    const model = getModelById(MODEL_ID);
    if (!model) {
      throw new Error("expected model.nemotron-3-super in registry");
    }

    const items = deriveCuratedRelatedItems(
      model,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.mixture-of-experts")
        ?.href,
    ).toBe("/docs/modules/mixture-of-experts");
    expect(
      items.find(
        (item) => item.registryId === "module.mamba-selective-state-space",
      )?.href,
    ).toBe("/docs/modules/mamba-selective-state-space");
    expect(
      items.find((item) => item.registryId === "concept.context-window")?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      items.find((item) => item.registryId === "system.routing")?.href,
    ).toBe("/docs/systems/routing");
    expect(
      items.find((item) => item.registryId === "system.inference-engine")?.href,
    ).toBe("/docs/systems/inference-engine");
    expect(
      items.find((item) => item.registryId === "system.deployment")?.href,
    ).toBe("/docs/systems/deployment");
  });

  test("routing and MoE registry surfaces link back to the Nemotron 3 Super model page", () => {
    const routing = getSystemById("system.routing");
    if (!routing) {
      throw new Error("expected system.routing in registry");
    }

    const routingItems = deriveCuratedRelatedItems(
      routing,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      routingItems.find((item) => item.registryId === MODEL_ID)?.href,
    ).toBe("/docs/models/nemotron-3-super");

    const moe = getModuleById("module.mixture-of-experts");
    if (!moe) {
      throw new Error("expected module.mixture-of-experts in registry");
    }

    const moeItems = deriveCuratedRelatedItems(
      moe,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(moeItems.find((item) => item.registryId === MODEL_ID)?.href).toBe(
      "/docs/models/nemotron-3-super",
    );
  });

  test("registry validation passes for the Nemotron 3 Super relationship slice", async () => {
    const issues = await validateRegistryContent();
    const touchedIssues = issues.filter((issue) =>
      TOUCHED_RECORD_IDS.some((recordId) => issue.message.includes(recordId)),
    );

    expect(touchedIssues).toEqual([]);
  });
});
