import { describe, expect, test } from "bun:test";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPageFromDisk } from "./concept-page-load";
import { getProjectRoot } from "./content-paths";
import {
  formatGeneratePageBundlePlan,
  GeneratePageBundleError,
  generatePageBundle,
  resolvePageBundlePaths,
} from "./generate-page-bundle";
import { loadGlossaryPageFromDisk } from "./glossary-page-load";
import { type PageSpec, validatePageSpec } from "./page-spec";
import { readScaffoldedPageRegistryId } from "./scaffold-doc-page";

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createTemplateFixtureRoot(): Promise<string> {
  const tempRoot = join(
    import.meta.dir,
    "__generate-fixtures__",
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
  await mkdir(join(contentRoot, "registry", "concepts"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "modules"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "models"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "papers"), { recursive: true });
  await mkdir(join(contentRoot, "registry", "training-regimes"), {
    recursive: true,
  });
  await mkdir(join(contentRoot, "docs", "glossary"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "concepts"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "modules"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "models"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "papers"), { recursive: true });
  await mkdir(join(contentRoot, "docs", "training"), { recursive: true });
  return contentRoot;
}

const baseSpecFields = {
  slug: "generated-page",
  title: "Generated Page",
  summary: "Reader-facing summary for cards and search.",
};

describe("resolvePageBundlePaths", () => {
  test("maps glossary specs to concept registry paths and glossary docs", () => {
    const spec = validatePageSpec({
      ...baseSpecFields,
      kind: "glossary",
      conceptType: "general",
    });
    const paths = resolvePageBundlePaths(spec, getProjectRoot());

    expect(paths.registryPath).toContain(
      join("src", "content", "registry", "concepts", "generated-page.json"),
    );
    expect(paths.pagePath).toContain(
      join("src", "content", "docs", "glossary", "generated-page", "page.mdx"),
    );
  });

  test("maps module specs to module registry and docs paths", () => {
    const spec = validatePageSpec({
      ...baseSpecFields,
      kind: "module",
      moduleType: "attention",
    });
    const paths = resolvePageBundlePaths(spec, getProjectRoot());

    expect(paths.registryPath).toContain(
      join("src", "content", "registry", "modules", "generated-page.json"),
    );
    expect(paths.pagePath).toContain(
      join("src", "content", "docs", "modules", "generated-page", "page.mdx"),
    );
  });
});

describe("generatePageBundle", () => {
  test("dry-run prints planned paths without writing files", async () => {
    const slug = `dry-run-${crypto.randomUUID()}`;
    const result = await generatePageBundle({
      spec: {
        ...baseSpecFields,
        slug,
        kind: "concept",
        conceptType: "architecture",
      },
      dryRun: true,
      projectRoot: getProjectRoot(),
    });

    expect(result.registryId).toBe(`concept.${slug}`);
    expect(result.route).toBe(`/docs/concepts/${slug}`);
    expect(result.writtenFiles).toEqual([]);
    expect(result.plannedFiles).toHaveLength(5);
    expect(
      result.plannedFiles.some((file) => file.label.includes("graph registry")),
    ).toBe(true);

    for (const file of result.plannedFiles) {
      expect(await pathExists(file.path)).toBe(false);
    }

    expect(formatGeneratePageBundlePlan(result)).toContain(result.route);
  });

  test("writes glossary bundle with substituted ids and page-spec messages", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    await prepareContentRoots(tempRoot);

    const slug = "generated-glossary-term";
    const result = await generatePageBundle({
      spec: {
        ...baseSpecFields,
        slug,
        kind: "glossary",
        conceptType: "architecture",
        tags: ["attention"],
        aliases: ["generated alias"],
        relatedIds: ["concept.token"],
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

    const contentRoot = join(tempRoot, "src", "content");
    expect(result.registryId).toBe(`concept.${slug}`);
    expect(result.writtenFiles).toHaveLength(5);

    const registry = JSON.parse(
      await readFile(
        join(contentRoot, "registry", "concepts", `${slug}.json`),
        "utf8",
      ),
    ) as {
      id: string;
      kind: string;
      conceptType: string;
      relatedIds: string[];
      updatedAt: string;
    };
    expect(registry.id).toBe(`concept.${slug}`);
    expect(registry.kind).toBe("concept");
    expect(registry.conceptType).toBe("architecture");
    expect(registry.relatedIds).toEqual(["concept.token"]);
    expect(registry.updatedAt).toBe("2026-06-11T00:00:00.000Z");

    const pageRaw = await readFile(
      join(contentRoot, "docs", "glossary", slug, "page.mdx"),
      "utf8",
    );
    expect(pageRaw).toContain('kind: "glossary"');
    expect(pageRaw).toContain(`registryId: "concept.${slug}"`);
    expect(pageRaw).toContain('updatedAt: "2026-06-11"');
    expect(pageRaw).toContain('title: "Generated Page"');
    expect(pageRaw).not.toContain("concept.example-glossary");
    expect(pageRaw).toContain('<T k="sections.whatItIs.body" />');
    expect(pageRaw).not.toMatch(/Glossary body from page spec/);

    const messages = JSON.parse(
      await readFile(
        join(contentRoot, "docs", "glossary", slug, "messages", "en.json"),
        "utf8",
      ),
    ) as {
      title: string;
      description: string;
      sections: { whatItIs: { body: string } };
    };
    expect(messages.title).toBe("Generated Page");
    expect(messages.description).toBe(
      "Reader-facing summary for cards and search.",
    );
    expect(messages.sections.whatItIs.body).toBe(
      "Glossary body from page spec.",
    );

    const assets = JSON.parse(
      await readFile(
        join(contentRoot, "docs", "glossary", slug, "assets.json"),
        "utf8",
      ),
    ) as { conceptMap: { graphId: string } };
    expect(assets.conceptMap.graphId).toBe(
      "graph.generated-glossary-term-concept-map",
    );

    const graphRecord = JSON.parse(
      await readFile(
        join(
          contentRoot,
          "registry",
          "graphs",
          "generated-glossary-term-concept-map.json",
        ),
        "utf8",
      ),
    ) as { id: string; subjectId: string };
    expect(graphRecord.id).toBe("graph.generated-glossary-term-concept-map");
    expect(graphRecord.subjectId).toBe(`concept.${slug}`);

    const glossaryDocsRoot = join(contentRoot, "docs", "glossary");
    const loaded = await loadGlossaryPageFromDisk(slug, "en", glossaryDocsRoot);
    expect(loaded.messages.title).toBe("Generated Page");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: loaded.messages,
        assets: loaded.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: loaded.content,
      }),
    );
    expect(html).toContain("Glossary body from page spec.");

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("writes concept bundle under docs/concepts", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    await prepareContentRoots(tempRoot);

    const slug = "generated-concept-term";
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

    const contentRoot = join(tempRoot, "src", "content");
    const pageRaw = await readFile(
      join(contentRoot, "docs", "concepts", slug, "page.mdx"),
      "utf8",
    );
    const authoringGuide = await readFile(
      join(tempRoot, "docs", "templates", "concept.content.md"),
      "utf8",
    );
    expect(pageRaw).toContain('kind: "concept"');
    expect(pageRaw).not.toContain("concept.example-concept");
    expect(pageRaw).toContain('title: "Generated Page"');
    expect(pageRaw).toContain(
      'description: "Reader-facing summary for cards and search."',
    );
    expect(pageRaw).not.toContain("Concept Template Authoring Guide");
    expect(pageRaw).not.toContain("Baseline exclusions");
    expect(pageRaw).not.toContain(authoringGuide.slice(0, 80));

    const pageRegistryId = await readScaffoldedPageRegistryId(
      join(contentRoot, "docs", "concepts", slug, "page.mdx"),
    );
    expect(pageRegistryId).toBe(`concept.${slug}`);

    const conceptsDocsRoot = join(contentRoot, "docs", "concepts");
    const loaded = await loadConceptPageFromDisk(slug, "en", conceptsDocsRoot);
    expect(loaded.messages.title).toBe("Generated Page");

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("writes page-spec assetMessages into messages without draft placeholders", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    await prepareContentRoots(tempRoot);

    const slug = "generated-concept-asset-messages";
    await generatePageBundle({
      spec: {
        ...baseSpecFields,
        slug,
        kind: "concept",
        conceptType: "general",
        assetMessages: {
          conceptMap: {
            alt: "Diagram alt text supplied by the page spec.",
            caption: "Caption text supplied by the page spec.",
          },
        },
      },
      projectRoot: tempRoot,
    });

    const messages = JSON.parse(
      await readFile(
        join(
          tempRoot,
          "src",
          "content",
          "docs",
          "concepts",
          slug,
          "messages",
          "en.json",
        ),
        "utf8",
      ),
    ) as {
      assets: { conceptMap: { alt: string; caption: string } };
    };
    expect(messages.assets.conceptMap.alt).toBe(
      "Diagram alt text supplied by the page spec.",
    );
    expect(messages.assets.conceptMap.caption).toBe(
      "Caption text supplied by the page spec.",
    );
    expect(messages.assets.conceptMap.alt).not.toContain("Draft placeholder");

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("writes module bundle with page-spec assets and registry fields", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    await prepareContentRoots(tempRoot);

    const slug = "generated-module-term";
    await generatePageBundle({
      spec: {
        ...baseSpecFields,
        slug,
        kind: "module",
        releaseDate: "2023-05-01",
        authors: ["Joshua Ainslie"],
        sourceId: "citation.gqa-paper",
        moduleType: "attention",
        moduleFamily: "attention",
        variantGroup: "attention-head-sharing",
        optimizes: ["kv-cache"],
        practicalBenefits: ["lower KV-cache memory"],
        assets: {
          computeFlow: {
            type: "graph",
            graphId: "graph.generated-module-term-compute-flow",
            webRenderer: "react-flow",
            printRenderer: "mermaid",
          },
        },
      },
      projectRoot: tempRoot,
    });

    const contentRoot = join(tempRoot, "src", "content");
    const registry = JSON.parse(
      await readFile(
        join(contentRoot, "registry", "modules", `${slug}.json`),
        "utf8",
      ),
    ) as {
      authors: string[];
      id: string;
      releaseDate: string;
      moduleType: string;
      moduleFamily: string;
      sourceId: string;
      variantGroup: string;
      optimizes: string[];
    };
    expect(registry.id).toBe(`module.${slug}`);
    expect(registry.releaseDate).toBe("2023-05-01");
    expect(registry.authors).toEqual(["Joshua Ainslie"]);
    expect(registry.sourceId).toBe("citation.gqa-paper");
    expect(registry.moduleType).toBe("attention");
    expect(registry.moduleFamily).toBe("attention");
    expect(registry.variantGroup).toBe("attention-head-sharing");
    expect(registry.optimizes).toEqual(["kv-cache"]);

    const assets = JSON.parse(
      await readFile(
        join(contentRoot, "docs", "modules", slug, "assets.json"),
        "utf8",
      ),
    ) as { computeFlow: { graphId: string } };
    expect(assets.computeFlow.graphId).toBe(
      "graph.generated-module-term-compute-flow",
    );

    const messages = JSON.parse(
      await readFile(
        join(contentRoot, "docs", "modules", slug, "messages", "en.json"),
        "utf8",
      ),
    ) as { title: string };
    expect(messages.title).toBe("Generated Page");

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("writes model, paper, and training-regime bundles to expected paths", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);

    const modelSlug = "generated-model-term";
    const paperSlug = "generated-paper-term";
    const regimeSlug = "generated-training-regime";

    const specs: PageSpec[] = [
      validatePageSpec({
        ...baseSpecFields,
        slug: modelSlug,
        kind: "model",
        family: "gpt",
        sourceType: "open-weights",
        modalities: ["text"],
        moduleIds: ["module.attention"],
      }),
      validatePageSpec({
        ...baseSpecFields,
        slug: paperSlug,
        kind: "paper",
        authors: ["A. Author"],
        publishedAt: "2024-01-01",
        url: "https://example.com/paper",
        introducesIds: ["module.attention"],
      }),
      validatePageSpec({
        ...baseSpecFields,
        slug: regimeSlug,
        kind: "training-regime",
        regimeType: "pretraining",
        relatedModuleIds: ["module.attention"],
      }),
    ];

    for (const spec of specs) {
      const result = await generatePageBundle({
        spec,
        projectRoot: tempRoot,
      });
      expect(result.writtenFiles).toHaveLength(5);
    }

    expect(
      await pathExists(
        join(contentRoot, "docs", "models", modelSlug, "page.mdx"),
      ),
    ).toBe(true);
    expect(
      await pathExists(
        join(contentRoot, "registry", "models", `${modelSlug}.json`),
      ),
    ).toBe(true);

    const modelRegistry = JSON.parse(
      await readFile(
        join(contentRoot, "registry", "models", `${modelSlug}.json`),
        "utf8",
      ),
    ) as { family: string; moduleIds: string[] };
    expect(modelRegistry.family).toBe("gpt");
    expect(modelRegistry.moduleIds).toEqual(["module.attention"]);

    expect(
      await pathExists(
        join(contentRoot, "docs", "papers", paperSlug, "page.mdx"),
      ),
    ).toBe(true);
    const paperPage = await readFile(
      join(contentRoot, "docs", "papers", paperSlug, "page.mdx"),
      "utf8",
    );
    expect(paperPage).toContain('registryId: "paper.generated-paper-term"');
    expect(paperPage).not.toContain("paper.example-paper");

    const paperRegistry = JSON.parse(
      await readFile(
        join(contentRoot, "registry", "papers", `${paperSlug}.json`),
        "utf8",
      ),
    ) as { authors: string[]; url: string };
    expect(paperRegistry.authors).toEqual(["A. Author"]);
    expect(paperRegistry.url).toBe("https://example.com/paper");

    expect(
      await pathExists(
        join(contentRoot, "docs", "training", regimeSlug, "page.mdx"),
      ),
    ).toBe(true);
    const regimeRegistry = JSON.parse(
      await readFile(
        join(contentRoot, "registry", "training-regimes", `${regimeSlug}.json`),
        "utf8",
      ),
    ) as { regimeType: string; relatedModuleIds: string[] };
    expect(regimeRegistry.regimeType).toBe("pretraining");
    expect(regimeRegistry.relatedModuleIds).toEqual(["module.attention"]);

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("writes graph registry records from page-spec graph nodes without hand-authored graph fixtures", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    const contentRoot = await prepareContentRoots(tempRoot);
    const slug = "generated-graph-from-spec";

    await generatePageBundle({
      spec: {
        ...baseSpecFields,
        slug,
        kind: "concept",
        conceptType: "general",
        tags: ["attention"],
        graph: {
          nodes: {
            input: {
              label: "Spec input node",
              summary: "First node from the page spec.",
            },
            output: {
              label: "Spec output node",
              summary: "Second node from the page spec.",
            },
          },
        },
      },
      projectRoot: tempRoot,
    });

    const graphRecord = JSON.parse(
      await readFile(
        join(contentRoot, "registry", "graphs", `${slug}-concept-map.json`),
        "utf8",
      ),
    ) as {
      id: string;
      rootNodeId: string;
      nodes: Array<{ id: string; labelKey: string; childNodeIds: string[] }>;
      edges: Array<{ source: string; target: string }>;
    };
    expect(graphRecord.id).toBe(`graph.${slug}-concept-map`);
    expect(graphRecord.rootNodeId).toBe("input");
    expect(graphRecord.nodes.map((node) => node.id)).toEqual([
      "input",
      "output",
    ]);
    expect(graphRecord.nodes[0]?.childNodeIds).toEqual(["output"]);
    expect(graphRecord.edges[0]).toMatchObject({
      source: "input",
      target: "output",
    });

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("refuses to overwrite existing bundle files", async () => {
    const tempRoot = await createTemplateFixtureRoot();
    await prepareContentRoots(tempRoot);

    const slug = "overwrite-guard";
    const spec = {
      ...baseSpecFields,
      slug,
      kind: "concept" as const,
      conceptType: "general" as const,
    };

    await generatePageBundle({ spec, projectRoot: tempRoot });

    await expect(
      generatePageBundle({ spec, projectRoot: tempRoot }),
    ).rejects.toThrow(GeneratePageBundleError);

    await rm(tempRoot, { recursive: true, force: true });
  });
});
