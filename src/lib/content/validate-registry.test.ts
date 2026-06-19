import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultLocale, supportedLocales } from "@/lib/i18n/locale-routing";
import { TAG_MESSAGES_ROOT } from "./content-paths";
import { tokenGlossaryPageDir } from "./page-messages-load";
import { loadRegistry } from "./registry";
import {
  validateColocatedPageBundle,
  validateRegistryContent,
} from "./validate-registry";

const validModuleRecord = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  kind: "module",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["GQA"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: ["citation.gqa-paper"],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  moduleType: "attention",
  optimizes: ["kv-cache"],
  exampleModelIds: [],
  improvesOnIds: [],
  tradeoffIds: [],
  usedByModelIds: [],
  introducedByPaperIds: [],
  mathLevel: "light",
};

const validTagRecord = {
  id: "tag.attention",
  slug: "attention",
  kind: "tag",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["self-attention"],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  category: "module-type",
  landingPage: "generated-tag-page",
};

const validConceptRecord = {
  id: "concept.example",
  slug: "example",
  kind: "concept",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  conceptType: "general",
  prerequisiteIds: [],
  explainsIds: [],
};

const validModelRecord = {
  id: "model.demo",
  slug: "demo",
  kind: "model",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["demo-model"],
  tags: [],
  relatedIds: [],
  citationIds: ["citation.gqa-paper"],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  family: "demo",
  sourceType: "open-weights",
  modalities: ["text"],
  architectureIds: [],
  moduleIds: [],
  trainingRegimeIds: [],
  datasetIds: [],
  paperIds: [],
};

const validCitationRecord = {
  id: "citation.gqa-paper",
  slug: "gqa-paper",
  kind: "citation",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  citationType: "paper",
  authors: ["Ainslie et al."],
  title: "GQA: Training Generalized Multi-Query Transformer Models",
  url: "https://arxiv.org/abs/2305.13245",
  mla: 'Ainslie, Joshua, et al. "GQA." arXiv, 2023.',
  year: 2023,
};

const nonDefaultLocales = supportedLocales.filter(
  (locale) => locale !== defaultLocale,
);

describe("validateRegistryContent", () => {
  test("returns no errors for the committed Phase 1 baseline", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });

  test("reports duplicate registry ids with record id in the message", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    const duplicateModule = {
      ...validModuleRecord,
      slug: "duplicate-module-a",
    };
    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify(duplicateModule),
    );
    await writeFile(
      join(registryRoot, "modules", "other-module.json"),
      JSON.stringify({
        ...duplicateModule,
        slug: "duplicate-module-b",
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((error) =>
          error.message.includes(
            'Duplicate registry id "module.grouped-query-attention"',
          ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports invalid sidebar grouping metadata before registry validation continues", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        sidebarGrouping: {
          modules: "not-a-real-group",
        },
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(
          (error) =>
            error.message.includes("module.grouped-query-attention") &&
            error.message.includes('"not-a-real-group"'),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports missing asset message keys with the page directory path", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const pageDirectory = join(tempRoot, "token-glossary");
    await mkdir(join(pageDirectory, "messages"), { recursive: true });

    await writeFile(
      join(pageDirectory, "messages", "en.json"),
      JSON.stringify({
        title: "Token",
        description: "A token is a unit of text.",
      }),
    );
    await writeFile(
      join(pageDirectory, "assets.json"),
      JSON.stringify({
        conceptMap: {
          type: "graph",
          graphId: "graph.token-concept-map",
          altKey: "assets.conceptMap.missingAlt",
          webRenderer: "react-flow",
          printRenderer: "mermaid",
        },
      }),
    );

    try {
      const { errors } = await validateColocatedPageBundle(pageDirectory);
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(
          (error) =>
            error.message.includes(pageDirectory) &&
            error.message.includes(
              'missing message key "assets.conceptMap.missingAlt"',
            ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports unresolved graph ids when registry indexes are provided", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const pageDirectory = join(tempRoot, "token-glossary");
    await mkdir(join(pageDirectory, "messages"), { recursive: true });

    await writeFile(
      join(pageDirectory, "messages", "en.json"),
      JSON.stringify({
        title: "Token",
        description: "A token is a unit of text.",
        assets: {
          conceptMap: {
            alt: "Alt text",
            caption: "Caption text",
          },
        },
      }),
    );
    await writeFile(
      join(pageDirectory, "assets.json"),
      JSON.stringify({
        conceptMap: {
          type: "graph",
          graphId: "graph.missing-token-map",
          altKey: "assets.conceptMap.alt",
          captionKey: "assets.conceptMap.caption",
          webRenderer: "react-flow",
          printRenderer: "mermaid",
        },
      }),
    );

    try {
      const indexes = await loadRegistry({
        registryRoot: join(import.meta.dir, "../../content/registry"),
      });
      const { errors } = await validateColocatedPageBundle(
        pageDirectory,
        indexes,
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(
          (error) =>
            error.code === "unresolved-graph-id" &&
            error.message.includes("graph.missing-token-map"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("validates token glossary colocated messages and assets via validateRegistryContent", async () => {
    const registryRoot = join(import.meta.dir, "../../content/registry");
    const docsRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
        phase1PageDirectories: [tokenGlossaryPageDir],
      });
      expect(errors).toEqual([]);
    } finally {
      await rm(docsRoot, { recursive: true, force: true });
    }
  });

  test("reports missing relatedIds targets with record id and missing related id", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        relatedIds: ["module.missing-related"],
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(
          (error) =>
            error.code === "unresolved-reference" &&
            error.message.includes("module.grouped-query-attention") &&
            error.message.includes("relatedIds") &&
            error.message.includes('missing record "module.missing-related"'),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports unknown tag references with record id and tag slug", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        tags: ["attention", "unknown-tag-slug"],
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(
          (error) =>
            error.code === "unresolved-tag" &&
            error.message.includes("module.grouped-query-attention") &&
            error.message.includes('unknown tag "unknown-tag-slug"'),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports page directory slug mismatch for concept-backed pages", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const pageDir = join(docsRoot, "glossary", "wrong-slug");
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(pageDir, "messages"), { recursive: true });

    await writeFile(
      join(registryRoot, "concepts", "example.json"),
      JSON.stringify(validConceptRecord),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(pageDir, "page.mdx"),
      `---
kind: glossary
registryId: concept.example
messageNamespace: local
assetNamespace: local
status: draft
tags:
  - attention
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({ title: "Example", description: "Desc" }),
    );
    await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
        phase1PageDirectories: [],
      });
      expect(
        errors.some(
          (error) =>
            error.code === "page-slug-mismatch" &&
            error.message.includes("wrong-slug") &&
            error.message.includes('registry slug "example"'),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports frontmatter kind mismatch including glossary versus concept registry", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const pageDir = join(docsRoot, "concepts", "example");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });
    await mkdir(join(pageDir, "messages"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify(validModuleRecord),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );
    await writeFile(
      join(pageDir, "page.mdx"),
      `---
kind: concept
registryId: module.grouped-query-attention
messageNamespace: local
assetNamespace: local
status: draft
tags:
  - attention
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({ title: "GQA", description: "Desc" }),
    );
    await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
        phase1PageDirectories: [],
      });
      expect(
        errors.some(
          (error) =>
            error.code === "kind-mismatch" &&
            error.message.includes('kind "concept"') &&
            error.message.includes('kind "module"'),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports unresolved page registryId", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const docsRoot = join(tempRoot, "docs");
    const pageDir = join(docsRoot, "concepts", "orphan");
    await mkdir(join(pageDir, "messages"), { recursive: true });

    await writeFile(
      join(pageDir, "page.mdx"),
      `---
kind: concept
registryId: concept.missing
messageNamespace: local
assetNamespace: local
status: draft
tags:
  - attention
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({ title: "Orphan", description: "Desc" }),
    );
    await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));

    try {
      const errors = await validateRegistryContent({
        registryRoot: join(import.meta.dir, "../../content/registry"),
        docsRoot,
        phase1PageDirectories: [],
      });
      expect(
        errors.some(
          (error) =>
            error.code === "unresolved-registry-id" &&
            error.message.includes("concept.missing"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("allows published records to reference draft targets that exist in the registry", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });

    await writeFile(
      join(registryRoot, "concepts", "published-source.json"),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.published-source",
        slug: "published-source",
        relatedIds: ["concept.draft-target"],
        status: "published",
      }),
    );
    await writeFile(
      join(registryRoot, "concepts", "draft-target.json"),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.draft-target",
        slug: "draft-target",
        status: "draft",
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({ registryRoot, docsRoot });
      expect(
        errors.filter((error) => error.code === "unresolved-reference"),
      ).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("does not require published-only reference resolution on draft source records", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });

    await writeFile(
      join(registryRoot, "concepts", "draft-source.json"),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.draft-source",
        slug: "draft-source",
        relatedIds: ["concept.missing-target"],
        status: "draft",
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({ registryRoot, docsRoot });
      expect(
        errors.some((error) => error.code === "unresolved-reference"),
      ).toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("discovers nested page.mdx files and validates MDX message and asset references", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const pageDir = join(docsRoot, "concepts", "nested-page");
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(pageDir, "messages"), { recursive: true });

    await writeFile(
      join(registryRoot, "concepts", "nested-page.json"),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.nested-page",
        slug: "nested-page",
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(pageDir, "page.mdx"),
      `---
kind: concept
registryId: concept.nested-page
messageNamespace: local
assetNamespace: local
status: draft
tags:
  - attention
updatedAt: "2026-06-02"
---

# <T k="title" />
<T k="missing.body" />
<ConceptMap assetId="missingAsset" />
`,
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({ title: "Nested", description: "Desc" }),
    );
    await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
        phase1PageDirectories: [],
      });
      expect(
        errors.some(
          (error) =>
            error.code === "missing-message-key" &&
            error.message.includes("missing.body"),
        ),
      ).toBe(true);
      expect(
        errors.some(
          (error) =>
            error.code === "unknown-asset-id" &&
            error.message.includes("missingAsset"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports unresolved citation references", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        citationIds: ["citation.missing-paper"],
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((error) =>
          error.message.includes(
            'citationIds references missing record "citation.missing-paper"',
          ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports published modules without references unless explicitly excepted", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "reference-free-module.json"),
      JSON.stringify({
        ...validModuleRecord,
        id: "module.reference-free-module",
        slug: "reference-free-module",
        citationIds: [],
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "missing-required-citation" &&
            error.message.includes("module.reference-free-module") &&
            error.message.includes("must include at least one reference"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports published models without references", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "models"), { recursive: true });
    await writeFile(
      join(registryRoot, "models", "demo.json"),
      JSON.stringify({
        ...validModelRecord,
        citationIds: [],
      }),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "missing-required-citation" &&
            error.message.includes("model.demo") &&
            error.message.includes("must include at least one reference"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports published modules missing standardized release metadata", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "missing-at-a-glance.json"),
      JSON.stringify({
        ...validModuleRecord,
        id: "module.missing-at-a-glance",
        slug: "missing-at-a-glance",
        releaseDate: undefined,
        authors: undefined,
        sourceId: undefined,
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "missing-release-metadata" &&
            error.message.includes("module.missing-at-a-glance") &&
            error.message.includes("missing releaseDate, authors, sourceId"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("allowlists current legacy modules missing standardized release metadata", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "absolute-positional-embeddings.json"),
      JSON.stringify({
        ...validModuleRecord,
        id: "module.absolute-positional-embeddings",
        slug: "absolute-positional-embeddings",
        releaseDate: undefined,
        authors: undefined,
        sourceId: undefined,
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "missing-release-metadata" &&
            error.message.includes("module.absolute-positional-embeddings"),
        ),
      ).toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports published training regimes missing standardized release metadata", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "training-regimes"), { recursive: true });
    await writeFile(
      join(registryRoot, "training-regimes", "demo-regime.json"),
      JSON.stringify({
        id: "training-regime.demo-regime",
        slug: "demo-regime",
        kind: "training-regime",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: [],
        relatedIds: [],
        citationIds: ["citation.gqa-paper"],
        status: "published",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
        regimeType: "distillation",
        usedByModelIds: [],
        relatedModuleIds: [],
        paperIds: [],
      }),
    );
    await mkdir(join(registryRoot, "citations"), { recursive: true });
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "missing-release-metadata" &&
            error.message.includes("training-regime.demo-regime") &&
            error.message.includes("published training-regime records"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports missing localized asset text keys for shipped non-default docs pages", async () => {
    for (const locale of nonDefaultLocales) {
      const tempRoot = join(
        import.meta.dir,
        "__fixtures__",
        crypto.randomUUID(),
      );
      const registryRoot = join(tempRoot, "registry");
      const docsRoot = join(tempRoot, "docs");
      const pageDir = join(docsRoot, "glossary", "embedding");
      await mkdir(join(registryRoot, "concepts"), { recursive: true });
      await mkdir(join(registryRoot, "tags"), { recursive: true });
      await mkdir(join(pageDir, "messages"), { recursive: true });

      await writeFile(
        join(registryRoot, "concepts", "embedding.json"),
        JSON.stringify({
          ...validConceptRecord,
          id: "concept.embedding",
          slug: "embedding",
        }),
      );
      await writeFile(
        join(registryRoot, "tags", "attention.json"),
        JSON.stringify(validTagRecord),
      );
      await writeFile(
        join(pageDir, "page.mdx"),
        `---
kind: glossary
registryId: concept.embedding
messageNamespace: local
assetNamespace: local
status: published
tags:
  - attention
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
      );
      await writeFile(
        join(pageDir, "messages", "en.json"),
        JSON.stringify({
          title: "Localized Page",
          description: "English description",
          assets: {
            hero: {
              alt: "English hero alt",
            },
          },
        }),
      );
      await writeFile(
        join(pageDir, "messages", `${locale}.json`),
        JSON.stringify({
          title: `${locale} localized page`,
          description: `${locale} description`,
        }),
      );
      await writeFile(
        join(pageDir, "assets.json"),
        JSON.stringify({
          hero: {
            type: "image",
            src: "./assets/hero.png",
            altKey: "assets.hero.alt",
          },
        }),
      );

      try {
        const errors = await validateRegistryContent({
          registryRoot,
          docsRoot,
          phase1PageDirectories: [],
          shippedLocalizedDocsManifest: {
            [locale]: ["glossary/embedding"],
          },
        });
        expect(
          errors.some(
            (error) =>
              error.code === "missing-message-key" &&
              error.message.includes(`locale "${locale}"`) &&
              error.message.includes('asset "hero"') &&
              error.message.includes('missing message key "assets.hero.alt"'),
          ),
        ).toBe(true);
      } finally {
        await rm(tempRoot, { recursive: true, force: true });
      }
    }
  });

  test("reports missing japanese page messages for docs declared shipped in the locale manifest", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const pageDir = join(docsRoot, "modules", "multi-query-attention");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });
    await mkdir(join(pageDir, "messages"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "multi-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        id: "module.multi-query-attention",
        slug: "multi-query-attention",
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );
    await writeFile(
      join(pageDir, "page.mdx"),
      `---
kind: module
registryId: module.multi-query-attention
messageNamespace: local
assetNamespace: local
status: published
tags:
  - attention
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({
        title: "Multi-Query Attention",
        description: "English description",
      }),
    );
    await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
        phase1PageDirectories: [],
        shippedLocalizedDocsManifest: {
          ja: ["modules/multi-query-attention"],
        },
      });
      expect(
        errors.some(
          (error) =>
            error.code === "missing-localized-page-messages" &&
            error.message.includes('locale "ja"') &&
            error.message.includes("/ja/docs/modules/multi-query-attention"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports invalid japanese page messages for docs declared shipped in the locale manifest", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const pageDir = join(docsRoot, "modules", "multi-query-attention");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });
    await mkdir(join(pageDir, "messages"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "multi-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        id: "module.multi-query-attention",
        slug: "multi-query-attention",
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );
    await writeFile(
      join(pageDir, "page.mdx"),
      `---
kind: module
registryId: module.multi-query-attention
messageNamespace: local
assetNamespace: local
status: published
tags:
  - attention
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({
        title: "Multi-Query Attention",
        description: "English description",
      }),
    );
    await writeFile(
      join(pageDir, "messages", "ja.json"),
      JSON.stringify({
        title: "マルチクエリアテンション",
      }),
    );
    await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
        phase1PageDirectories: [],
        shippedLocalizedDocsManifest: {
          ja: ["modules/multi-query-attention"],
          vi: [],
        },
      });
      expect(
        errors.some(
          (error) =>
            error.code === "messages-load-error" &&
            error.message.includes("/ja/docs/modules/multi-query-attention") &&
            error.message.includes("Page messages schema validation failed"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports localized page messages for docs not declared shipped in the locale manifest", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const pageDir = join(docsRoot, "concepts", "localized-page");
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(pageDir, "messages"), { recursive: true });

    await writeFile(
      join(registryRoot, "concepts", "localized-page.json"),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.localized-page",
        slug: "localized-page",
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(pageDir, "page.mdx"),
      `---
kind: concept
registryId: concept.localized-page
messageNamespace: local
assetNamespace: local
status: published
tags:
  - attention
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({
        title: "Localized Page",
        description: "English description",
      }),
    );
    await writeFile(
      join(pageDir, "messages", "ja.json"),
      JSON.stringify({
        title: "ローカライズ済みページ",
        description: "日本語の説明",
      }),
    );
    await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
        phase1PageDirectories: [],
      });
      expect(
        errors.some(
          (error) =>
            error.code === "unexpected-localized-page-messages" &&
            error.message.includes('locale "ja"') &&
            error.message.includes(
              'docs slug "concepts/localized-page" is not declared in the shipped localized docs manifest',
            ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports missing non-default tag messages for published tag pages", async () => {
    for (const locale of nonDefaultLocales) {
      const tempRoot = join(
        import.meta.dir,
        "__fixtures__",
        crypto.randomUUID(),
      );
      const registryRoot = join(tempRoot, "registry");
      const docsRoot = join(tempRoot, "docs-empty");
      const slug = `localized-tag-${crypto.randomUUID()}`;
      await mkdir(join(registryRoot, "tags"), { recursive: true });
      await mkdir(docsRoot, { recursive: true });
      await mkdir(TAG_MESSAGES_ROOT, { recursive: true });

      await writeFile(
        join(registryRoot, "tags", `${slug}.json`),
        JSON.stringify({
          ...validTagRecord,
          id: `tag.${slug}`,
          slug,
        }),
      );
      await writeFile(
        join(TAG_MESSAGES_ROOT, `${slug}.en.json`),
        JSON.stringify({
          title: "Localized Tag",
          summary: "English tag summary",
        }),
      );

      try {
        const errors = await validateRegistryContent({
          registryRoot,
          docsRoot,
          phase1PageDirectories: [],
        });
        expect(
          errors.some(
            (error) =>
              error.code === "tag-messages-load-error" &&
              error.message.includes(`/${locale}/tags/${slug}`) &&
              error.message.includes(`locale "${locale}"`),
          ),
        ).toBe(true);
      } finally {
        await rm(join(TAG_MESSAGES_ROOT, `${slug}.en.json`), {
          force: true,
        });
        await rm(tempRoot, { recursive: true, force: true });
      }
    }
  });

  test("reports missing non-default shared UI messages for shipped locales", async () => {
    for (const locale of nonDefaultLocales) {
      const tempRoot = join(
        import.meta.dir,
        "__fixtures__",
        crypto.randomUUID(),
      );
      const registryRoot = join(tempRoot, "registry");
      const docsRoot = join(tempRoot, "docs-empty");
      const messagesRoot = join(tempRoot, "messages");
      await mkdir(join(registryRoot, "tags"), { recursive: true });
      await mkdir(docsRoot, { recursive: true });
      await mkdir(join(messagesRoot, "en"), { recursive: true });

      await writeFile(
        join(registryRoot, "tags", "attention.json"),
        JSON.stringify(validTagRecord),
      );
      await writeFile(
        join(messagesRoot, "en", "common.json"),
        JSON.stringify({
          nav: {
            home: "Home",
          },
        }),
      );

      try {
        const errors = await validateRegistryContent({
          registryRoot,
          docsRoot,
          messagesRoot,
          phase1PageDirectories: [],
        });
        expect(
          errors.some(
            (error) =>
              error.code === "ui-messages-load-error" &&
              error.message.includes(`locale "${locale}"`),
          ),
        ).toBe(true);
      } finally {
        await rm(tempRoot, { recursive: true, force: true });
      }
    }
  });
});

describe("make validate-data", () => {
  test("succeeds on the committed Phase 1 baseline", async () => {
    const proc = Bun.spawn({
      cmd: ["make", "validate-data"],
      cwd: join(import.meta.dir, "../../.."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).toBe(0);
  });
});

describe("validate-registry CLI", () => {
  test("exits 0 on baseline and 1 when registry references are broken", async () => {
    const baseline = Bun.spawn({
      cmd: ["bun", "./scripts/validate-registry.ts"],
      cwd: join(import.meta.dir, "../../.."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const baselineCode = await baseline.exited;
    expect(baselineCode).toBe(0);

    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        citationIds: ["citation.missing-paper"],
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const broken = Bun.spawn({
      cmd: [
        "bun",
        "-e",
        `import { validateRegistryContent, formatValidationErrors } from "./src/lib/content/validate-registry.ts";
const errors = await validateRegistryContent({ registryRoot: ${JSON.stringify(registryRoot)}, docsRoot: ${JSON.stringify(join(tempRoot, "docs-empty"))} });
if (errors.length === 0) process.exit(0);
console.error(formatValidationErrors(errors));
process.exit(1);`,
      ],
      cwd: join(import.meta.dir, "../../.."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const brokenCode = await broken.exited;
    expect(brokenCode).toBe(1);

    await rm(tempRoot, { recursive: true, force: true });
  });
});
