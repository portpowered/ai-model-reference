import { describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { TOCItemType } from "fumadocs-core/toc";
import {
  getModelsDocsRoot,
  getPapersDocsRoot,
  getProjectRoot,
  getSystemsDocsRoot,
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
import { loadSystemPageFromDisk } from "@/lib/content/system-page-load";
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
  await mkdir(join(contentRoot, "registry", "systems"), { recursive: true });
  await mkdir(join(docsRoot, "models"), { recursive: true });
  await mkdir(join(docsRoot, "papers"), { recursive: true });
  await mkdir(join(docsRoot, "training"), { recursive: true });
  await mkdir(join(docsRoot, "systems"), { recursive: true });
  return contentRoot;
}

const baseSpecFields = {
  slug: "generated-page",
  title: "Generated Page",
  summary: "Reader-facing summary for cards and search.",
  openingSummary: "Folded opening summary for the page hero.",
};

function hasTocUrl(url: string) {
  return (item: TOCItemType) => item.url === url;
}

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

  test("returns model, paper, training, and system refs for extended page kinds", () => {
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
    expect(parseLocalDocsPageRef(["systems", "on-disk-kv-cache"])).toEqual({
      section: "systems",
      slug: "on-disk-kv-cache",
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
    expect(page.toc.some(hasTocUrl("#what-it-is"))).toBe(true);
  });

  test("loadLocalDocsPage resolves shipped vietnamese canonical page messages without changing the shared MDX route contract", async () => {
    const page = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "grouped-query-attention",
      },
      "vi",
    );

    expect(page.messages.title).toBe("Grouped-query attention");
    expect(page.messages.sections?.whatItIs?.title).toBe("Nó là gì");
    expect(page.frontmatter.registryId).toBe("module.grouped-query-attention");
    expect(page.toc.some(hasTocUrl("#what-it-is"))).toBe(true);
  });

  test("loadLocalDocsPage resolves the shipped japanese attention proof set through the shared MDX route contract", async () => {
    const transformerPage = await loadLocalDocsPage(
      {
        section: "concepts",
        slug: "transformer-architecture",
      },
      "ja",
    );
    const tokenPage = await loadLocalDocsPage(
      {
        section: "glossary",
        slug: "token",
      },
      "ja",
    );
    const attentionPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "attention",
      },
      "ja",
    );
    const groupedQueryAttentionPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "grouped-query-attention",
      },
      "ja",
    );
    const multiHeadPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "multi-head-attention",
      },
      "ja",
    );
    const multiQueryPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "multi-query-attention",
      },
      "ja",
    );
    const slidingWindowPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "sliding-window-attention",
      },
      "ja",
    );
    const linearAttentionPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "linear-attention",
      },
      "ja",
    );

    expect(transformerPage.messages.title).toBe("Transformer アーキテクチャ");
    expect(transformerPage.messages.sections?.whatItIs?.title).toBe(
      "これは何か",
    );

    expect(tokenPage.messages.description).toContain(
      "言語モデルが読み取り、予測する",
    );
    expect(tokenPage.messages.graph?.nodes?.rawText?.label).toBe("生テキスト");

    expect(attentionPage.messages.openingSummary).toContain(
      "各 token がどの token を重視するべきか",
    );
    expect(attentionPage.messages.sections?.howItWorks?.title).toBe(
      "どう動くか",
    );

    expect(
      groupedQueryAttentionPage.messages.assets?.computeFlow?.caption,
    ).toBe(
      "Multi-head attention と grouped-query attention を切り替えて、query head 数と key-value head 数を同じ図で比較します。",
    );
    expect(
      groupedQueryAttentionPage.messages.tables?.comparison?.dimensions
        ?.kvHeadCount,
    ).toBe("Key-value head 数");
    expect(groupedQueryAttentionPage.toc.some(hasTocUrl("#what-it-is"))).toBe(
      true,
    );

    expect(multiHeadPage.messages.sections?.whatItOptimizes?.body).toContain(
      "表現の幅",
    );
    expect(multiQueryPage.messages.sections?.whatItOptimizes?.body).toContain(
      "KV-cache サイズ",
    );
    expect(
      slidingWindowPage.messages.sections?.whatItOptimizes?.body,
    ).toContain("attention 計算コスト");
    expect(
      linearAttentionPage.messages.sections?.whatItOptimizes?.body,
    ).toContain("系列長スケーリング");
  });

  test("loadLocalDocsPage resolves shipped vietnamese head-sharing module messages through the shared MDX route contract", async () => {
    const multiHeadPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "multi-head-attention",
      },
      "vi",
    );
    const multiQueryPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "multi-query-attention",
      },
      "vi",
    );

    expect(multiHeadPage.messages.title).toBe("Multi-head attention");
    expect(multiHeadPage.messages.sections?.whatItIs?.title).toBe("Nó là gì");
    expect(multiHeadPage.frontmatter.registryId).toBe(
      "module.multi-head-attention",
    );
    expect(multiHeadPage.toc.some(hasTocUrl("#what-it-is"))).toBe(true);

    expect(multiQueryPage.messages.title).toBe("Multi-query attention");
    expect(multiQueryPage.messages.sections?.whatItIs?.title).toBe("Nó là gì");
    expect(multiQueryPage.frontmatter.registryId).toBe(
      "module.multi-query-attention",
    );
    expect(multiQueryPage.toc.some(hasTocUrl("#what-it-is"))).toBe(true);
  });

  test("loadLocalDocsPage resolves shipped vietnamese long-context module messages through the shared MDX route contract", async () => {
    const slidingWindowPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "sliding-window-attention",
      },
      "vi",
    );
    const linearAttentionPage = await loadLocalDocsPage(
      {
        section: "modules",
        slug: "linear-attention",
      },
      "vi",
    );

    expect(slidingWindowPage.messages.title).toBe("Sliding-window attention");
    expect(slidingWindowPage.messages.sections?.whatItIs?.title).toBe(
      "Nó là gì",
    );
    expect(slidingWindowPage.frontmatter.registryId).toBe(
      "module.sliding-window-attention",
    );
    expect(slidingWindowPage.toc.some(hasTocUrl("#what-it-is"))).toBe(true);

    expect(linearAttentionPage.messages.title).toBe("Linear attention");
    expect(linearAttentionPage.messages.sections?.whatItIs?.title).toBe(
      "Nó là gì",
    );
    expect(linearAttentionPage.frontmatter.registryId).toBe(
      "module.linear-attention",
    );
    expect(linearAttentionPage.toc.some(hasTocUrl("#what-it-is"))).toBe(true);
  });

  test("loadLocalDocsPage loads generated model, paper, training, and system bundles", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const docsRoot = join(contentRoot, "docs");

    const modelSlug = "generated-model-loader";
    const paperSlug = "generated-paper-loader";
    const trainingSlug = "generated-training-loader";
    const systemSlug = "generated-system-loader";

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
      await generatePageBundle({
        spec: validatePageSpec({
          ...baseSpecFields,
          slug: systemSlug,
          kind: "system",
          systemType: "serving",
          tags: ["systems"],
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

      const systemPage = await loadSystemPageFromDisk(
        systemSlug,
        "en",
        getSystemsDocsRoot(docsRoot),
      );
      expect(systemPage.messages.title).toBe("Generated Page");
      expect(systemPage.frontmatter.registryId).toBe(`system.${systemSlug}`);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
