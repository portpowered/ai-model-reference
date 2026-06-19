import { describe, expect, test } from "bun:test";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getSystemById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { loadSystemPage } from "./system-page";

describe("Deployment system page (deployment-system-page-001)", () => {
  test("registry record publishes deployment as a serving system with canonical discovery metadata", () => {
    const record = getSystemById("system.deployment");

    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("deployment");
    expect(record?.kind).toBe("system");
    expect(record?.systemType).toBe("serving");
    expect(record?.aliases).toEqual([
      "model deployment",
      "LLM deployment",
      "serving deployment",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.quantization",
      "concept.prefill-decode-split",
      "concept.kv-cache",
      "system.on-disk-kv-cache",
      "model.gpt-3",
    ]);
    expect(record?.relatedConceptIds).toEqual([
      "concept.quantization",
      "concept.kv-cache",
      "concept.prefill-decode-split",
      "concept.context-window",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("system.deployment")).toBe(true);
  });

  test("curated related links resolve to nearby published serving and model surfaces", () => {
    const source = getSystemById("system.deployment");
    if (!source) {
      throw new Error("expected system.deployment in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.quantization")?.href,
    ).toBe("/docs/concepts/quantization");
    expect(
      items.find((item) => item.registryId === "concept.prefill-decode-split")
        ?.href,
    ).toBe("/docs/glossary/prefill-decode-split");
    expect(
      items.find((item) => item.registryId === "system.on-disk-kv-cache")?.href,
    ).toBe("/docs/systems/on-disk-kv-cache");
    expect(items.find((item) => item.registryId === "model.gpt-3")?.href).toBe(
      "/docs/models/gpt-3",
    );
  });

  test("page bundle carries deployment framing and the system flow graph contract", async () => {
    const page = await loadSystemPage("deployment");

    expect(page.frontmatter.kind).toBe("system");
    expect(page.frontmatter.registryId).toBe("system.deployment");
    expect(page.frontmatter.tags).toEqual([
      "foundations",
      "quantization",
      "kv-cache",
    ]);
    expect(page.messages.openingSummary).toContain("becomes a service");
    expect(page.messages.sections?.whereItSits.body).toContain(
      "target hardware",
    );
    expect(page.messages.sections?.practicalImpact.body).toContain("rollback");
    const systemFlowAsset = page.assets.systemFlow;
    expect(systemFlowAsset?.type).toBe("graph");
    if (systemFlowAsset?.type !== "graph") {
      throw new Error("expected deployment systemFlow asset to be a graph");
    }
    expect(systemFlowAsset.graphId).toBe("graph.deployment-system-flow");

    const graph = getGraphById("graph.deployment-system-flow");
    expect(graph?.subjectId).toBe("system.deployment");
    expect(graph?.nodes.map((node) => node.id)).toEqual([
      "package",
      "fit",
      "rollout",
      "rollback",
    ]);
  });

  test("search indexes deployment for representative deployment queries", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/systems/deployment",
    );
    expect(document?.kind).toBe("system");
    expect(document?.registryId).toBe("system.deployment");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "model deployment",
        "LLM deployment",
        "serving deployment",
      ]),
    );
    expect(document?.bodyText).toContain("target hardware");
    expect(document?.bodyText).toContain("rollback");

    for (const query of [
      "deployment",
      "model deployment",
      "LLM deployment",
      "serving deployment",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some((result) => result.url === "/docs/systems/deployment"),
      ).toBe(true);
    }
  });
});
