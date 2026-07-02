import { describe, expect, test } from "bun:test";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getModuleById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import {
  citationRecordSchema,
  moduleRecordSchema,
} from "@/lib/content/schemas";

describe("gated-deltanet module registry slice (gated-deltanet-001)", () => {
  test("publishes module.gated-deltanet with canonical discovery metadata", async () => {
    const indexes = await loadRegistry();
    const record = indexes.byId.get("module.gated-deltanet");
    const parsed = moduleRecordSchema.safeParse(record);

    expect(parsed.success).toBe(true);
    expect(record?.kind).toBe("module");
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("gated-deltanet");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.tags).toEqual(["attention", "context-window"]);
    expect(record?.aliases).toEqual(
      expect.arrayContaining([
        "Gated DeltaNet",
        "Gated Delta Network",
        "gated delta nets",
        "gated deltanet",
        "GDN",
        "gated delta rule",
      ]),
    );
    expect(record?.citationIds).toEqual([
      "citation.gated-delta-networks-paper",
    ]);
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "module.linear-attention",
      "module.sliding-window-attention",
      "module.sparse-attention",
      "module.multi-head-attention",
      "concept.context-window",
      "concept.why-long-context-is-hard",
      "model.qwen3-5-0-8b",
    ]);

    if (record?.kind !== "module") {
      throw new Error("expected module.gated-deltanet module record");
    }

    expect(record.moduleType).toBe("attention");
    expect(record.moduleFamily).toBe("attention");
    expect(record.conceptType).toBe("attention-variant");
    expect(record.variantGroup).toBe("subquadratic-attention");
    expect(record.primaryClassificationId).toBe(
      "classification.module.attention",
    );
    expect(record.sourceId).toBe("citation.gated-delta-networks-paper");
    expect(record.releaseDate).toBe("2024-12-09");
    expect(record.usedByModelIds).toEqual(["model.qwen3-5-0-8b"]);
    expect(record.improvesOnIds).toEqual(["module.linear-attention"]);
    expect(record.introducedByPaperIds).toEqual([
      "citation.gated-delta-networks-paper",
    ]);
  });

  test("registers the arXiv:2412.06464 citation backing the module", () => {
    const citation = getCitationById("citation.gated-delta-networks-paper");
    const parsed = citationRecordSchema.safeParse(citation);

    expect(parsed.success).toBe(true);
    expect(citation?.status).toBe("published");
    expect(citation?.url).toBe("https://arxiv.org/abs/2412.06464");
    expect(citation?.year).toBe(2025);
    expect(citation?.aliases).toEqual(
      expect.arrayContaining([
        "Gated Delta Networks paper",
        "Gated DeltaNet paper",
        "2412.06464",
      ]),
    );
  });

  test("curated related docs connect Gated DeltaNet to shipped nearby attention and long-context pages", () => {
    const source = getModuleById("module.gated-deltanet");

    if (source?.kind !== "module") {
      throw new Error("expected module.gated-deltanet module record");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "module.linear-attention")?.href,
    ).toBe("/docs/modules/linear-attention");
    expect(
      items.find(
        (item) => item.registryId === "module.sliding-window-attention",
      )?.href,
    ).toBe("/docs/modules/sliding-window-attention");
    expect(
      items.find((item) => item.registryId === "module.sparse-attention")?.href,
    ).toBe("/docs/modules/sparse-attention");
    expect(
      items.find((item) => item.registryId === "concept.context-window")?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      items.find(
        (item) => item.registryId === "concept.why-long-context-is-hard",
      )?.href,
    ).toBe("/docs/concepts/why-long-context-is-hard");
  });
});
