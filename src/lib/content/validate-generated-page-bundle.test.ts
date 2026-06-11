import { describe, expect, test } from "bun:test";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSearchDocument } from "@/lib/search/build-documents";
import { getProjectRoot } from "./content-paths";
import { generatePageBundle } from "./generate-page-bundle";
import { loadPageAssets } from "./page-assets-load";
import { loadPageMessages } from "./page-messages-load";
import { loadRegistry } from "./registry";
import {
  parseGeneratedRegistryRecord,
  validateGeneratedPageBundle,
  validateGeneratedPageBundleRegistryContent,
  validateGeneratedSearchText,
  validateRegistryFrontmatterAlignment,
} from "./validate-generated-page-bundle";

const validTagRecord = {
  id: "tag.attention",
  slug: "attention",
  kind: "tag",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  category: "module-type",
  landingPage: "generated-tag-page",
};

const baseSpecFields = {
  slug: "generated-page",
  title: "Generated Page",
  summary: "Reader-facing summary for cards and search.",
  openingSummary: "Folded opening summary for the page hero.",
};

function minimalGraphRecord(graphId: string, subjectId: string) {
  return {
    id: graphId,
    slug: graphId.replace(/^graph\./, ""),
    kind: "graph",
    defaultTitleKey: "title",
    defaultSummaryKey: "description",
    aliases: [],
    tags: ["attention"],
    relatedIds: [],
    citationIds: [],
    status: "draft",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
    subjectId,
    graphType: "concept-map",
    rootNodeId: "root",
    layout: "vertical-expandable",
    defaultExpandedDepth: 1,
    supportedRenderers: ["react-flow"],
    nodes: [
      {
        id: "root",
        labelKey: "graph.nodes.root.label",
        moduleKind: "other",
        childNodeIds: [],
      },
    ],
    edges: [],
  };
}

async function createTemplateFixtureRoot(): Promise<string> {
  const tempRoot = join(
    import.meta.dir,
    "__validate-bundle-fixtures__",
    crypto.randomUUID(),
  );
  await mkdir(join(tempRoot, "docs", "templates"), { recursive: true });
  await cp(
    join(getProjectRoot(), "docs", "templates"),
    join(tempRoot, "docs", "templates"),
    { recursive: true },
  );
  return tempRoot;
}

async function prepareContentRoots(tempRoot: string): Promise<string> {
  const contentRoot = join(tempRoot, "src", "content");
  await mkdir(join(contentRoot, "registry", "concepts"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "modules"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "models"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "papers"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "training-regimes"), {
    recursive: true,
  });
  await mkdir(join(contentRoot, "registry", "tags"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "graphs"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "glossary"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "concepts"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "modules"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "models"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "papers"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "training"), { recursive: true });
  return contentRoot;
}

async function writeTagFixture(contentRoot: string): Promise<void> {
  await writeFile(
    join(contentRoot, "registry", "tags", "attention.json"),
    JSON.stringify(validTagRecord),
  );
}

describe("validateGeneratedPageBundle", () => {
  test("glossary bundle loads through standard loaders and passes registry validation", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "generated-glossary-alignment";
    const registryId = `concept.${slug}`;
    const graphId = `graph.${slug}-concept-map`;

    try {
      await writeTagFixture(contentRoot);
      await writeFile(
        join(contentRoot, "registry", "graphs", `${slug}-concept-map.json`),
        JSON.stringify(minimalGraphRecord(graphId, registryId)),
      );

      await generatePageBundle({
        spec: {
          ...baseSpecFields,
          slug,
          kind: "glossary",
          conceptType: "architecture",
          tags: ["attention"],
          aliases: ["generated alias"],
          relatedIds: [],
          sections: {
            whatItIs: {
              title: "What It Is",
              body: "Glossary body from page spec.",
            },
          },
        },
        projectRoot: tempRoot,
        updatedAt: "2026-06-11",
      });

      const pageDir = join(contentRoot, "docs", "glossary", slug);
      const registryPath = join(
        contentRoot,
        "registry",
        "concepts",
        `${slug}.json`,
      );
      const indexes = await loadRegistry({
        registryRoot: join(contentRoot, "registry"),
      });

      const messages = await loadPageMessages(pageDir, "en");
      const assets = await loadPageAssets(pageDir);
      expect(messages.title).toBe("Generated Page");
      expect(assets.conceptMap?.type).toBe("graph");

      const registryRecord = parseGeneratedRegistryRecord(
        JSON.parse(await readFile(registryPath, "utf8")),
      );
      expect(registryRecord.defaultTitleKey).toBe("title");
      expect(registryRecord.defaultSummaryKey).toBe("description");
      expect(registryRecord.aliases).toEqual(["generated alias"]);

      const errors = await validateGeneratedPageBundle({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
        pageDirectory: pageDir,
        registryPath,
        pageUrl: `/docs/glossary/${slug}`,
        indexes,
      });
      expect(errors).toEqual([]);

      const registryErrors = await validateGeneratedPageBundleRegistryContent({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
      });
      expect(registryErrors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("concept bundle aligns registry record with frontmatter and message keys", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "generated-concept-alignment";
    const registryId = `concept.${slug}`;
    const graphId = `graph.${slug}-concept-map`;

    try {
      await writeTagFixture(contentRoot);
      await writeFile(
        join(contentRoot, "registry", "graphs", `${slug}-concept-map.json`),
        JSON.stringify(minimalGraphRecord(graphId, registryId)),
      );

      await generatePageBundle({
        spec: {
          ...baseSpecFields,
          slug,
          kind: "concept",
          conceptType: "math",
          tags: ["attention"],
        },
        projectRoot: tempRoot,
      });

      const pageDir = join(contentRoot, "docs", "concepts", slug);
      const registryPath = join(
        contentRoot,
        "registry",
        "concepts",
        `${slug}.json`,
      );
      const indexes = await loadRegistry({
        registryRoot: join(contentRoot, "registry"),
      });
      const messages = await loadPageMessages(pageDir, "en");
      const mdxSource = await readFile(join(pageDir, "page.mdx"), "utf8");
      const frontmatterMatch = mdxSource.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(frontmatterMatch?.[1]).toBeDefined();

      const registryRecord = parseGeneratedRegistryRecord(
        JSON.parse(await readFile(registryPath, "utf8")),
      );
      const { parseYamlFrontmatterBlock } = await import("./yaml-frontmatter");
      const { pageFrontmatterSchema } = await import("./schemas");
      const frontmatter = pageFrontmatterSchema.parse(
        parseYamlFrontmatterBlock(frontmatterMatch?.[1] ?? ""),
      );

      expect(
        validateRegistryFrontmatterAlignment(
          registryRecord,
          frontmatter,
          messages,
          pageDir,
        ),
      ).toEqual([]);

      const searchErrors = validateGeneratedSearchText(
        messages,
        frontmatter,
        `/docs/concepts/${slug}`,
        indexes,
      );
      expect(searchErrors).toEqual([]);

      const searchDocument = buildSearchDocument(
        {
          pageDir,
          docsSlug: `concepts/${slug}`,
          url: `/docs/concepts/${slug}`,
          frontmatter,
          messages,
        },
        indexes,
      );
      expect(searchDocument.title).toBe(messages.title);
      expect(searchDocument.description).toBe(messages.description);
      expect(searchDocument.bodyText).toContain("Folded opening summary");
      expect(mdxSource).not.toContain(
        "Folded opening summary for the page hero.",
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("module bundle aligns registry fields and resolves search text from messages", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "generated-module-alignment";
    const registryId = `module.${slug}`;
    const graphId = `graph.${slug}-compute-flow`;

    try {
      await writeTagFixture(contentRoot);
      await writeFile(
        join(contentRoot, "registry", "graphs", `${slug}-compute-flow.json`),
        JSON.stringify(minimalGraphRecord(graphId, registryId)),
      );

      await generatePageBundle({
        spec: {
          ...baseSpecFields,
          slug,
          kind: "module",
          moduleType: "attention",
          tags: ["attention"],
          optimizes: ["kv-cache"],
          practicalBenefits: ["lower KV-cache memory"],
        },
        projectRoot: tempRoot,
      });

      const pageDir = join(contentRoot, "docs", "modules", slug);
      const registryPath = join(
        contentRoot,
        "registry",
        "modules",
        `${slug}.json`,
      );
      const indexes = await loadRegistry({
        registryRoot: join(contentRoot, "registry"),
      });
      const messages = await loadPageMessages(pageDir, "en");
      const assets = await loadPageAssets(pageDir);

      expect(messages.title).toBe("Generated Page");
      expect(assets.computeFlow?.type).toBe("graph");

      const errors = await validateGeneratedPageBundle({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
        pageDirectory: pageDir,
        registryPath,
        pageUrl: `/docs/modules/${slug}`,
        indexes,
      });
      const knownFixtureGaps = new Set([
        "unresolved-table-id",
        "unresolved-table-module-id",
        "missing-table-message-key",
      ]);
      const tableErrors = errors.filter((error) =>
        knownFixtureGaps.has(error.code),
      );
      expect(tableErrors.length).toBeGreaterThan(0);
      expect(
        errors.filter((error) => !knownFixtureGaps.has(error.code)),
      ).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("model, paper, and training-regime registry records parse and align with generated bundles", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);

    const cases = [
      {
        kind: "model" as const,
        slug: "generated-model-alignment",
        spec: {
          ...baseSpecFields,
          slug: "generated-model-alignment",
          kind: "model" as const,
          family: "gpt",
          sourceType: "open-weights" as const,
          modalities: ["text" as const],
          tags: ["attention"],
        },
        pageUrl: "/docs/models/generated-model-alignment",
        graphSuffix: "architecture",
      },
      {
        kind: "paper" as const,
        slug: "generated-paper-alignment",
        spec: {
          ...baseSpecFields,
          slug: "generated-paper-alignment",
          kind: "paper" as const,
          authors: ["A. Author"],
          publishedAt: "2024-01-01",
          url: "https://example.com/paper",
          tags: ["attention"],
        },
        pageUrl: "/docs/papers/generated-paper-alignment",
        graphSuffix: "contribution",
      },
      {
        kind: "training-regime" as const,
        slug: "generated-training-alignment",
        spec: {
          ...baseSpecFields,
          slug: "generated-training-alignment",
          kind: "training-regime" as const,
          regimeType: "pretraining" as const,
          tags: ["attention"],
        },
        pageUrl: "/docs/training/generated-training-alignment",
        graphSuffix: "training-flow",
      },
    ];

    try {
      await writeTagFixture(contentRoot);

      for (const testCase of cases) {
        const registryId = `${testCase.kind}.${testCase.slug}`;
        const graphId = `graph.${testCase.slug}-${testCase.graphSuffix}`;
        await writeFile(
          join(
            contentRoot,
            "registry",
            "graphs",
            `${testCase.slug}-${testCase.graphSuffix}.json`,
          ),
          JSON.stringify(minimalGraphRecord(graphId, registryId)),
        );

        await generatePageBundle({
          spec: testCase.spec,
          projectRoot: tempRoot,
        });
      }

      const indexes = await loadRegistry({
        registryRoot: join(contentRoot, "registry"),
      });

      for (const testCase of cases) {
        const docsParent =
          testCase.kind === "training-regime"
            ? "training"
            : `${testCase.kind}s`;
        const registryDir =
          testCase.kind === "training-regime"
            ? "training-regimes"
            : `${testCase.kind}s`;
        const pageDir = join(contentRoot, "docs", docsParent, testCase.slug);
        const registryPath = join(
          contentRoot,
          "registry",
          registryDir,
          `${testCase.slug}.json`,
        );

        const registryRecord = parseGeneratedRegistryRecord(
          JSON.parse(await readFile(registryPath, "utf8")),
        );
        expect(registryRecord.kind).toBe(testCase.kind);
        expect(registryRecord.defaultTitleKey).toBe("title");
        expect(registryRecord.defaultSummaryKey).toBe("description");

        const errors = await validateGeneratedPageBundle({
          registryRoot: join(contentRoot, "registry"),
          docsRoot: join(contentRoot, "docs"),
          pageDirectory: pageDir,
          registryPath,
          pageUrl: testCase.pageUrl,
          indexes,
        });
        expect(errors).toEqual([]);
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
