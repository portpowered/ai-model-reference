import { describe, expect, test } from "bun:test";
import {
  baseRecordSchema,
  citationRecordSchema,
  classificationRecordSchema,
  conceptRecordSchema,
  moduleRecordSchema,
  pageAssetConfigSchema,
  pageFrontmatterSchema,
  pageMessagesSchema,
  registryRecordSchema,
  tagRecordSchema,
} from "./schemas";
import { validateSidebarGroupingForRecord } from "./sidebar-grouping";

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
  sortOrder: 10,
};

describe("registry schemas", () => {
  test("accepts a valid module record", () => {
    const result = moduleRecordSchema.safeParse({
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
      sidebarGrouping: {
        modules: "attention-foundations",
      },
    });
    expect(result.success).toBe(true);
  });

  test("accepts a valid tag record", () => {
    const result = tagRecordSchema.safeParse({
      ...validBaseFields,
      id: "tag.attention",
      slug: "attention",
      kind: "tag",
      category: "module-type",
      landingPage: "generated-tag-page",
    });
    expect(result.success).toBe(true);
  });

  test("accepts a valid citation record", () => {
    const result = citationRecordSchema.safeParse({
      ...validBaseFields,
      id: "citation.gqa-paper",
      slug: "gqa-paper",
      kind: "citation",
      citationType: "paper",
      authors: ["Ainslie et al."],
      title: "GQA: Training Generalized Multi-Query Transformer Models",
      url: "https://arxiv.org/abs/2305.13245",
      mla: 'Ainslie, Joshua, et al. "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints." arXiv, 2023.',
      year: 2023,
    });
    expect(result.success).toBe(true);
  });

  test("accepts a valid concept record", () => {
    const result = conceptRecordSchema.safeParse({
      ...validBaseFields,
      id: "concept.token",
      slug: "token",
      kind: "concept",
      conceptType: "architecture",
      prerequisiteIds: [],
      explainsIds: [],
      sidebarGrouping: {
        glossary: "sequence-and-attention",
      },
    });
    expect(result.success).toBe(true);
  });

  test("accepts a valid classification record", () => {
    const result = classificationRecordSchema.safeParse({
      ...validBaseFields,
      id: "classification.module.activation",
      slug: "activation-functions",
      kind: "classification",
      classificationType: "family",
      classifiesKinds: ["module"],
      parentClassificationId: "classification.module",
      legacyIds: ["classification.activation-functions"],
    });
    expect(result.success).toBe(true);
  });

  test("parses registry records through the kind discriminated union", () => {
    const result = registryRecordSchema.safeParse({
      ...validBaseFields,
      id: "tag.attention",
      slug: "attention",
      kind: "tag",
      category: "module-type",
      landingPage: "generated-tag-page",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("tag");
    }
  });

  test("rejects base records missing required fields", () => {
    const result = baseRecordSchema.safeParse({
      id: "module.incomplete",
      kind: "module",
    });
    expect(result.success).toBe(false);
  });

  test("rejects module records missing moduleType and related arrays", () => {
    const result = moduleRecordSchema.safeParse({
      ...validBaseFields,
      kind: "module",
      optimizes: ["kv-cache"],
      mathLevel: "none",
    });
    expect(result.success).toBe(false);
  });

  test("accepts ontology metadata on participating records", () => {
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
      primaryClassificationId: "classification.module.activation",
      secondaryClassificationIds: ["classification.module.feed-forward"],
      relationships: [
        {
          relationshipType: "uses",
          targetId: "concept.activation",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("rejects malformed ontology relationships", () => {
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

  test("reports unsupported sidebar grouping values with record id and value", () => {
    const issues = validateSidebarGroupingForRecord(
      "module",
      "module.grouped-query-attention",
      {
        modules: "wrong-group" as never,
      },
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("module.grouped-query-attention");
    expect(issues[0]?.message).toContain('"wrong-group"');
  });

  test("reports sidebar grouping sections that do not apply to the record kind", () => {
    const issues = validateSidebarGroupingForRecord(
      "module",
      "module.grouped-query-attention",
      {
        glossary: "model-taxonomy",
      },
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("module.grouped-query-attention");
    expect(issues[0]?.message).toContain("sidebarGrouping.glossary");
  });

  test("rejects tag records missing category and landingPage", () => {
    const result = tagRecordSchema.safeParse({
      ...validBaseFields,
      id: "tag.attention",
      slug: "attention",
      kind: "tag",
    });
    expect(result.success).toBe(false);
  });

  test("rejects citation records missing authors, title, url, or mla", () => {
    const result = citationRecordSchema.safeParse({
      ...validBaseFields,
      id: "citation.gqa-paper",
      slug: "gqa-paper",
      kind: "citation",
      citationType: "paper",
      authors: [],
      title: "",
      url: "not-a-url",
      mla: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects concept records missing conceptType or relationship arrays", () => {
    const result = conceptRecordSchema.safeParse({
      ...validBaseFields,
      id: "concept.token",
      slug: "token",
      kind: "concept",
    });
    expect(result.success).toBe(false);
  });
});

const validModuleFrontmatter = {
  kind: "module" as const,
  registryId: "module.grouped-query-attention",
  messageNamespace: "local" as const,
  assetNamespace: "local" as const,
  tags: ["attention", "kv-cache"],
  status: "published" as const,
  updatedAt: "2026-06-02",
};

const validPageMessages = {
  title: "Grouped-Query Attention",
  description: "An attention variant that reduces KV cache memory.",
  problemStatement: "KV caches get expensive as context length grows.",
  coreIdea: "GQA lets several query heads share fewer key-value heads.",
  sections: {
    whatItIs: {
      title: "What It Is",
      body: "Grouped-query attention is an attention variant derived from multi-head attention.",
    },
  },
  callouts: {
    readerShortcut: {
      title: "Reader Shortcut",
      body: "Think of GQA as sharing KV heads across query groups.",
    },
  },
  assets: {
    computeFlow: {
      alt: "Compute flow diagram",
      caption: "How GQA routes queries to shared KV heads",
    },
  },
};

const validPageAssetConfig = {
  hero: {
    type: "image" as const,
    src: "./assets/gqa-hero.png",
    altKey: "assets.hero.alt",
  },
  computeFlow: {
    type: "graph" as const,
    graphId: "graph.grouped-query-attention-compute-flow",
    webRenderer: "react-flow" as const,
    printRenderer: "mermaid" as const,
    altKey: "assets.computeFlow.alt",
    captionKey: "assets.computeFlow.caption",
  },
  mhaComparison: {
    type: "chart" as const,
    chartId: "chart.gqa-mha-comparison",
    altKey: "assets.mhaComparison.alt",
  },
  variantTable: {
    type: "table" as const,
    tableId: "table.gqa-variants",
    captionKey: "assets.variantTable.caption",
  },
  computeSchema: {
    type: "code-schema" as const,
    schemaId: "schema.gqa-compute",
    language: "typescript",
    captionKey: "assets.computeSchema.caption",
  },
};

describe("page schemas", () => {
  test("accepts valid module page frontmatter", () => {
    const result = pageFrontmatterSchema.safeParse(validModuleFrontmatter);
    expect(result.success).toBe(true);
  });

  test("accepts valid page messages with nested sections and asset keys", () => {
    const result = pageMessagesSchema.safeParse(validPageMessages);
    expect(result.success).toBe(true);
  });

  test("accepts valid page asset config with discriminated asset types", () => {
    const result = pageAssetConfigSchema.safeParse(validPageAssetConfig);
    expect(result.success).toBe(true);
  });

  test("rejects module frontmatter missing required fields", () => {
    const result = pageFrontmatterSchema.safeParse({
      kind: "module",
      registryId: "module.grouped-query-attention",
    });
    expect(result.success).toBe(false);
  });

  test("rejects page messages missing title or description", () => {
    const result = pageMessagesSchema.safeParse({
      title: "",
      description: "",
      sections: {
        whatItIs: {
          title: "What It Is",
        },
      },
    });
    expect(result.success).toBe(false);
  });

  test("rejects page messages with sections missing title", () => {
    const result = pageMessagesSchema.safeParse({
      title: "Grouped-Query Attention",
      description: "An attention variant.",
      sections: {
        whatItIs: {
          body: "Missing section title",
        },
      },
    });
    expect(result.success).toBe(false);
  });

  test("rejects asset config with missing required keys per type", () => {
    const imageResult = pageAssetConfigSchema.safeParse({
      hero: {
        type: "image",
        src: "./assets/gqa-hero.png",
      },
    });
    expect(imageResult.success).toBe(false);

    const graphResult = pageAssetConfigSchema.safeParse({
      computeFlow: {
        type: "graph",
        graphId: "graph.example",
        webRenderer: "react-flow",
      },
    });
    expect(graphResult.success).toBe(false);

    const chartResult = pageAssetConfigSchema.safeParse({
      chart: {
        type: "chart",
      },
    });
    expect(chartResult.success).toBe(false);
  });
});
