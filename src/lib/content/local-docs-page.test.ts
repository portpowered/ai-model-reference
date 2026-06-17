import { describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  getModelsDocsRoot,
  getPapersDocsRoot,
  getProjectRoot,
  getTrainingDocsRoot,
} from "@/lib/content/content-paths";
import { generatePageBundle } from "@/lib/content/generate-page-bundle";
import {
  isLocalMessageDocsPage,
  loadLocalDocsPage,
  parseLocalDocsPageRef,
} from "@/lib/content/local-docs-page";
import { loadModelPageFromDisk } from "@/lib/content/model-page-load";
import { validatePageSpec } from "@/lib/content/page-spec";
import { loadPaperPageFromDisk } from "@/lib/content/paper-page-load";
import { loadTrainingRegimePageFromDisk } from "@/lib/content/training-regime-page-load";
import { source } from "@/lib/source";

async function createTemplateFixtureRoot(): Promise<string> {
  const tempRoot = join(
    import.meta.dir,
    "__local-docs-fixtures__",
    crypto.randomUUID(),
  );
  const { cp } = await import("node:fs/promises");
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
  const docsRoot = join(contentRoot, "docs");
  await mkdir(join(contentRoot, "registry", "models"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "papers"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "training-regimes"), {
    recursive: true,
  });
  await mkdir(join(docsRoot, "models"), { recursive: true });
  await mkdir(join(docsRoot, "papers"), { recursive: true });
  await mkdir(join(docsRoot, "training"), { recursive: true });
  return contentRoot;
}

const baseSpecFields = {
  slug: "generated-page",
  title: "Generated Page",
  summary: "Reader-facing summary for cards and search.",
  openingSummary: "Folded opening summary for the page hero.",
};

describe("parseLocalDocsPageRef", () => {
  test("returns glossary ref for glossary slugs", () => {
    expect(parseLocalDocsPageRef(["glossary", "token"])).toEqual({
      section: "glossary",
      slug: "token",
    });
  });

  test("returns concept ref for concept slugs", () => {
    expect(
      parseLocalDocsPageRef(["concepts", "transformer-architecture"]),
    ).toEqual({
      section: "concepts",
      slug: "transformer-architecture",
    });
  });

  test("returns module ref for module slugs", () => {
    expect(
      parseLocalDocsPageRef(["modules", "grouped-query-attention"]),
    ).toEqual({
      section: "modules",
      slug: "grouped-query-attention",
    });
  });

  test("returns model, paper, and training refs for extended page kinds", () => {
    expect(parseLocalDocsPageRef(["models", "gpt-2"])).toEqual({
      section: "models",
      slug: "gpt-2",
    });
    expect(
      parseLocalDocsPageRef(["papers", "attention-is-all-you-need"]),
    ).toEqual({
      section: "papers",
      slug: "attention-is-all-you-need",
    });
    expect(parseLocalDocsPageRef(["training", "pretraining"])).toEqual({
      section: "training",
      slug: "pretraining",
    });
  });

  test("returns null for non-local docs paths", () => {
    expect(parseLocalDocsPageRef(["getting-started"])).toBeNull();
    expect(parseLocalDocsPageRef(undefined)).toBeNull();
  });
});

describe("isLocalMessageDocsPage", () => {
  test("detects local message namespace frontmatter", () => {
    expect(isLocalMessageDocsPage({ messageNamespace: "local" })).toBe(true);
    expect(isLocalMessageDocsPage({ messageNamespace: "shared" })).toBe(false);
  });
});

describe("docs source local pages", () => {
  test("exposes representative glossary, concept, and module slugs for static export", () => {
    const tokenPage = source.getPage(["glossary", "token"]);
    const conceptPage = source.getPage([
      "concepts",
      "transformer-architecture",
    ]);
    const modulePage = source.getPage(["modules", "grouped-query-attention"]);

    expect(tokenPage).toBeDefined();
    expect(conceptPage).toBeDefined();
    expect(modulePage).toBeDefined();
    expect(tokenPage?.url).toBe("/docs/glossary/token");
    expect(conceptPage?.url).toBe("/docs/concepts/transformer-architecture");
    expect(modulePage?.url).toBe("/docs/modules/grouped-query-attention");
  });

  test("generateParams includes representative published glossary, concept, and module slugs", () => {
    const params = source.generateParams();
    const slugParams = params.map((entry) => entry.slug);
    expect(slugParams).toContainEqual(["glossary", "token"]);
    expect(slugParams).toContainEqual(["concepts", "transformer-architecture"]);
    expect(slugParams).toContainEqual(["modules", "grouped-query-attention"]);
  });

  test("loadLocalDocsPage resolves localized metadata for glossary pages", async () => {
    const page = await loadLocalDocsPage({
      section: "glossary",
      slug: "token",
    });

    expect(page.messages.title).toBe("Token");
    expect(page.messages.description?.length).toBeGreaterThan(0);
    expect(page.frontmatter.registryId).toBe("concept.token");
    expect(page.toc.some((item) => item.url === "#what-it-is")).toBe(true);
  });

  test("loadLocalDocsPage fails clearly when a shipped vi canonical page is missing page-local messages", async () => {
    await expect(
      loadLocalDocsPage(
        {
          section: "modules",
          slug: "grouped-query-attention",
        },
        "vi",
      ),
    ).rejects.toMatchObject({
      name: "MessageLoadError",
      message: expect.stringContaining(
        'route "/vi/docs/modules/grouped-query-attention"',
      ),
    });
  });

  test("loadLocalDocsPage loads generated model, paper, and training bundles", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const docsRoot = join(contentRoot, "docs");

    const modelSlug = "generated-model-loader";
    const paperSlug = "generated-paper-loader";
    const trainingSlug = "generated-training-loader";

    try {
      await generatePageBundle({
        spec: validatePageSpec({
          ...baseSpecFields,
          slug: modelSlug,
          kind: "model",
          family: "gpt",
          sourceType: "open-weights",
          modalities: ["text"],
          tags: ["foundations"],
        }),
        projectRoot: tempRoot,
      });
      await generatePageBundle({
        spec: validatePageSpec({
          ...baseSpecFields,
          slug: paperSlug,
          kind: "paper",
          authors: ["A. Author"],
          publishedAt: "2024-01-01",
          url: "https://example.com/paper",
          tags: ["foundations"],
        }),
        projectRoot: tempRoot,
      });
      await generatePageBundle({
        spec: validatePageSpec({
          ...baseSpecFields,
          slug: trainingSlug,
          kind: "training-regime",
          regimeType: "pretraining",
          tags: ["foundations"],
        }),
        projectRoot: tempRoot,
      });

      const modelPage = await loadModelPageFromDisk(
        modelSlug,
        "en",
        getModelsDocsRoot(docsRoot),
      );
      expect(modelPage.messages.title).toBe("Generated Page");
      expect(modelPage.frontmatter.registryId).toBe(`model.${modelSlug}`);

      const paperPage = await loadPaperPageFromDisk(
        paperSlug,
        "en",
        getPapersDocsRoot(docsRoot),
      );
      expect(paperPage.messages.title).toBe("Generated Page");
      expect(paperPage.frontmatter.registryId).toBe(`paper.${paperSlug}`);

      const trainingPage = await loadTrainingRegimePageFromDisk(
        trainingSlug,
        "en",
        getTrainingDocsRoot(docsRoot),
      );
      expect(trainingPage.messages.title).toBe("Generated Page");
      expect(trainingPage.frontmatter.registryId).toBe(
        `training-regime.${trainingSlug}`,
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
