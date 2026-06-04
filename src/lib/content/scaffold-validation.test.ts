import { describe, expect, test } from "bun:test";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parsePageAssetConfig, validatePageAssetReferences } from "./assets";
import { getProjectRoot } from "./content-paths";
import {
  readScaffoldedPageRegistryId,
  scaffoldDocPage,
} from "./scaffold-doc-page";
import { pageMessagesSchema } from "./schemas";
import { validateRegistryContent } from "./validate-registry";

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

async function scaffoldFixtureRoot(): Promise<string> {
  const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
  await mkdir(join(tempRoot, "docs", "templates"), { recursive: true });
  await cp(
    join(getProjectRoot(), "docs", "templates"),
    join(tempRoot, "docs", "templates"),
    { recursive: true },
  );
  await mkdir(join(tempRoot, "src", "content", "registry", "concepts"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "tags"), {
    recursive: true,
  });
  await mkdir(join(tempRoot, "src", "content", "registry", "graphs"), {
    recursive: true,
  });
  return tempRoot;
}

describe("scaffold and validation integration", () => {
  test("scaffolded glossary bundle satisfies schemas and validateRegistryContent", async () => {
    const tempRoot = await scaffoldFixtureRoot();
    const contentRoot = join(tempRoot, "src", "content");
    const slug = "scaffold-validation-glossary";
    const registryId = `concept.${slug}`;
    const graphId = `graph.${slug}-concept-map`;

    await mkdir(join(contentRoot, "docs", "glossary"), { recursive: true });

    try {
      await scaffoldDocPage({
        kind: "glossary",
        slug,
        title: "Scaffold Validation Glossary",
        conceptType: "general",
        tags: ["attention"],
        projectRoot: tempRoot,
      });

      await writeFile(
        join(contentRoot, "registry", "tags", "attention.json"),
        JSON.stringify(validTagRecord),
      );
      await writeFile(
        join(contentRoot, "registry", "graphs", `${slug}-concept-map.json`),
        JSON.stringify(minimalGraphRecord(graphId, registryId)),
      );

      const pageDir = join(contentRoot, "docs", "glossary", slug);
      const pageRegistryId = await readScaffoldedPageRegistryId(
        join(pageDir, "page.mdx"),
      );
      expect(pageRegistryId).toBe(registryId);

      const messages = pageMessagesSchema.parse(
        JSON.parse(
          await readFile(join(pageDir, "messages", "en.json"), "utf8"),
        ),
      );
      expect(messages.title).toBe("Scaffold Validation Glossary");
      expect(messages.description.length).toBeGreaterThan(0);
      expect(messages.sections?.whatItIs.title).toBe("What It Is");
      expect(messages.assets?.conceptMap.alt?.length).toBeGreaterThan(0);

      const assets = parsePageAssetConfig(
        JSON.parse(await readFile(join(pageDir, "assets.json"), "utf8")),
      );
      expect(assets.conceptMap).toMatchObject({
        type: "graph",
        graphId,
        webRenderer: "react-flow",
        printRenderer: "mermaid",
        altKey: "assets.conceptMap.alt",
        captionKey: "assets.conceptMap.caption",
      });
      expect(validatePageAssetReferences(assets, messages)).toEqual([]);

      const errors = await validateRegistryContent({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
        phase1PageDirectories: [],
      });
      expect(errors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("scaffolded concept bundle satisfies schemas and validateRegistryContent", async () => {
    const tempRoot = await scaffoldFixtureRoot();
    const contentRoot = join(tempRoot, "src", "content");
    const slug = "scaffold-validation-concept";
    const registryId = `concept.${slug}`;
    const graphId = `graph.${slug}-concept-map`;

    await mkdir(join(contentRoot, "docs", "concepts"), { recursive: true });

    try {
      await scaffoldDocPage({
        kind: "concept",
        slug,
        title: "Scaffold Validation Concept",
        conceptType: "math",
        tags: ["attention"],
        projectRoot: tempRoot,
      });

      await writeFile(
        join(contentRoot, "registry", "tags", "attention.json"),
        JSON.stringify(validTagRecord),
      );
      await writeFile(
        join(contentRoot, "registry", "graphs", `${slug}-concept-map.json`),
        JSON.stringify(minimalGraphRecord(graphId, registryId)),
      );

      const pageDir = join(contentRoot, "docs", "concepts", slug);
      const messages = pageMessagesSchema.parse(
        JSON.parse(
          await readFile(join(pageDir, "messages", "en.json"), "utf8"),
        ),
      );
      expect(messages.title).toBe("Scaffold Validation Concept");

      const assets = parsePageAssetConfig(
        JSON.parse(await readFile(join(pageDir, "assets.json"), "utf8")),
      );
      expect(assets.conceptMap.type).toBe("graph");
      if (assets.conceptMap.type === "graph") {
        expect(assets.conceptMap.graphId).toBe(graphId);
      }

      const errors = await validateRegistryContent({
        registryRoot: join(contentRoot, "registry"),
        docsRoot: join(contentRoot, "docs"),
        phase1PageDirectories: [],
      });
      expect(errors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
