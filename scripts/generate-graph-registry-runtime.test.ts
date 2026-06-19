import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncGraphRegistryRuntimeModule } from "./generate-graph-registry-runtime";

const cleanupPaths: string[] = [];

afterEach(() => {
  for (const path of cleanupPaths.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

function createGraphRecordJson(id: string, slug: string): string {
  return `${JSON.stringify(
    {
      id,
      kind: "graph",
      slug,
      defaultTitleKey: `${slug}.title`,
      defaultSummaryKey: `${slug}.summary`,
      aliases: [],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "published",
      createdAt: "2026-06-19T00:00:00.000Z",
      updatedAt: "2026-06-19T00:00:00.000Z",
      subjectId: "concept.sample-graph",
      graphType: "concept-map",
      rootNodeId: "node-a",
      layout: "vertical-expandable",
      defaultExpandedDepth: 1,
      supportedRenderers: ["react-flow"],
      nodes: [
        {
          id: "node-a",
          labelKey: `${slug}.nodes.node-a.label`,
          moduleKind: "input",
          childNodeIds: [],
        },
      ],
      edges: [],
    },
    null,
    2,
  )}\n`;
}

describe("generate-graph-registry-runtime", () => {
  test("writes imports for every graph file in sorted filename order", () => {
    const root = mkdtempSync(join(tmpdir(), "graph-runtime-generator-"));
    cleanupPaths.push(root);
    const graphsRoot = join(root, "graphs");
    const outputPath = join(root, "graph-registry-runtime.generated.ts");
    mkdirSync(graphsRoot, { recursive: true });

    writeFileSync(
      join(graphsRoot, "zebra-graph.json"),
      createGraphRecordJson("graph.zebra-graph", "zebra-graph"),
      "utf8",
    );
    writeFileSync(
      join(graphsRoot, "alpha-graph.json"),
      createGraphRecordJson("graph.alpha-graph", "alpha-graph"),
      "utf8",
    );

    const result = syncGraphRegistryRuntimeModule({ graphsRoot, outputPath });
    const output = readFileSync(outputPath, "utf8");

    expect(result.changed).toBe(true);
    expect(result.graphCount).toBe(2);
    expect(output.indexOf("alphaGraphGraphRecord")).toBeLessThan(
      output.indexOf("zebraGraphGraphRecord"),
    );
    expect(output).toContain(
      'import alphaGraphGraphRecord from "@/content/registry/graphs/alpha-graph.json";',
    );
    expect(output).toContain(
      'import zebraGraphGraphRecord from "@/content/registry/graphs/zebra-graph.json";',
    );
  });

  test("picks up a newly added graph file without editing a manual registry module", () => {
    const root = mkdtempSync(join(tmpdir(), "graph-runtime-generator-"));
    cleanupPaths.push(root);
    const graphsRoot = join(root, "graphs");
    const outputPath = join(root, "graph-registry-runtime.generated.ts");
    mkdirSync(graphsRoot, { recursive: true });

    writeFileSync(
      join(graphsRoot, "existing-graph.json"),
      createGraphRecordJson("graph.existing-graph", "existing-graph"),
      "utf8",
    );

    const initial = syncGraphRegistryRuntimeModule({ graphsRoot, outputPath });
    expect(initial.graphCount).toBe(1);

    writeFileSync(
      join(graphsRoot, "new-graph.json"),
      createGraphRecordJson("graph.new-graph", "new-graph"),
      "utf8",
    );

    const updated = syncGraphRegistryRuntimeModule({ graphsRoot, outputPath });
    const output = readFileSync(outputPath, "utf8");

    expect(updated.changed).toBe(true);
    expect(updated.graphCount).toBe(2);
    expect(output).toContain(
      'import newGraphGraphRecord from "@/content/registry/graphs/new-graph.json";',
    );
    expect(output).toContain("graphRecordSchema.parse(newGraphGraphRecord)");
  });

  test("fails with an actionable error when a graph record is invalid", () => {
    const root = mkdtempSync(join(tmpdir(), "graph-runtime-generator-"));
    cleanupPaths.push(root);
    const graphsRoot = join(root, "graphs");
    const outputPath = join(root, "graph-registry-runtime.generated.ts");
    mkdirSync(graphsRoot, { recursive: true });

    writeFileSync(
      join(graphsRoot, "invalid-graph.json"),
      JSON.stringify({ id: "graph.invalid", kind: "graph" }, null, 2),
      "utf8",
    );

    expect(() =>
      syncGraphRegistryRuntimeModule({ graphsRoot, outputPath }),
    ).toThrow(/Graph registry schema validation failed.*invalid-graph\.json/);
  });

  test("fails with an explicit error when duplicate graph ids are discovered", () => {
    const root = mkdtempSync(join(tmpdir(), "graph-runtime-generator-"));
    cleanupPaths.push(root);
    const graphsRoot = join(root, "graphs");
    const outputPath = join(root, "graph-registry-runtime.generated.ts");
    mkdirSync(graphsRoot, { recursive: true });

    writeFileSync(
      join(graphsRoot, "alpha-graph.json"),
      createGraphRecordJson("graph.duplicate-id", "alpha-graph"),
      "utf8",
    );
    writeFileSync(
      join(graphsRoot, "beta-graph.json"),
      createGraphRecordJson("graph.duplicate-id", "beta-graph"),
      "utf8",
    );

    expect(() =>
      syncGraphRegistryRuntimeModule({ graphsRoot, outputPath }),
    ).toThrow(
      /Duplicate graph registry id "graph\.duplicate-id" found in: .*alpha-graph\.json, .*beta-graph\.json/,
    );
  });
});
