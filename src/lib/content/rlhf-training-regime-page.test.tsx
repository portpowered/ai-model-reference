import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { listRelatedRegistryRecords } from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

describe("RLHF training-regime canonical discovery (rlhf-training-regime-page-001)", () => {
  test("publishes RLHF as a training-regime record and removes the glossary alias collision", async () => {
    const registry = await loadRegistry();
    const rlhf = registry.byId.get("training-regime.rlhf");
    expect(rlhf?.status).toBe("published");
    if (rlhf?.kind !== "training-regime") {
      throw new Error("expected training-regime.rlhf record in registry");
    }
    expect(rlhf.regimeType).toBe("alignment");
    expect(rlhf?.aliases).toEqual(
      expect.arrayContaining([
        "RLHF",
        "reinforcement learning from human feedback",
      ]),
    );
    expect(rlhf.relatedIds).toContain("concept.alignment");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.rlhf")).toBe(true);

    const alignment = registry.byId.get("concept.alignment");
    expect(alignment?.aliases).not.toContain("RLHF");
  });

  test("published docs metadata exposes RLHF as the canonical training route with alignment navigation", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.url === "/docs/training/rlhf");
    expect(page?.frontmatter.kind).toBe("training-regime");
    expect(page?.frontmatter.registryId).toBe("training-regime.rlhf");
    expect(page?.frontmatter.status).toBe("published");
    expect(page?.messages.title).toBe(
      "Reinforcement Learning from Human Feedback",
    );
    expect(page?.messages.openingSummary).toContain("pretrained model");

    const rlhf = registry.byId.get("training-regime.rlhf");
    if (rlhf?.kind !== "training-regime") {
      throw new Error("expected training-regime.rlhf record in registry");
    }
    const related = deriveCuratedRelatedItems(
      rlhf,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(
      related.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/glossary/alignment");
  });

  test("search indexes RLHF aliases onto the canonical training route", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/rlhf",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "RLHF",
        "reinforcement learning from human feedback",
      ]),
    );
    expect(document?.relatedIds).toContain("concept.alignment");

    const acronymResults = await docsSearchApi.search("RLHF");
    expect(acronymResults[0]?.url).toBe("/docs/training/rlhf");

    const fullNameResults = await docsSearchApi.search(
      "reinforcement learning from human feedback",
    );
    expect(
      fullNameResults.some((result) => result.url === "/docs/training/rlhf"),
    ).toBe(true);
  });
});
