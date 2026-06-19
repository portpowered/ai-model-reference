import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clearRegisteredGraphRecords,
  getGraphById,
} from "@/lib/content/graph-registry-runtime";
import { syncGraphRegistryForContentRoot } from "@/lib/content/root-graph-registry-load";

const cleanupPaths: string[] = [];

afterEach(() => {
  clearRegisteredGraphRecords();

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

function createTempContentRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "graph-runtime-root-"));
  cleanupPaths.push(root);
  mkdirSync(join(root, "registry", "graphs"), { recursive: true });
  return root;
}

describe("root-graph-registry-load", () => {
  test("throws an actionable error when a graph record is invalid", () => {
    const contentRoot = createTempContentRoot();

    writeFileSync(
      join(contentRoot, "registry", "graphs", "invalid-graph.json"),
      JSON.stringify({ id: "graph.invalid", kind: "graph" }, null, 2),
      "utf8",
    );

    expect(() => syncGraphRegistryForContentRoot(contentRoot)).toThrow(
      /Graph registry schema validation failed.*invalid-graph\.json/,
    );
  });

  test("throws an explicit error when duplicate graph ids are discovered", () => {
    const contentRoot = createTempContentRoot();

    writeFileSync(
      join(contentRoot, "registry", "graphs", "graph-a.json"),
      createGraphRecordJson("graph.duplicate-id", "graph-a"),
      "utf8",
    );
    writeFileSync(
      join(contentRoot, "registry", "graphs", "graph-b.json"),
      createGraphRecordJson("graph.duplicate-id", "graph-b"),
      "utf8",
    );

    expect(() => syncGraphRegistryForContentRoot(contentRoot)).toThrow(
      /Duplicate graph registry id "graph\.duplicate-id" found in: .*graph-a\.json, .*graph-b\.json/,
    );
  });

  test("returns undefined for a missing graph id without disturbing other graph lookups", () => {
    expect(getGraphById("graph.this-does-not-exist")).toBeUndefined();
    expect(getGraphById("graph.gpt-3-architecture")?.id).toBe(
      "graph.gpt-3-architecture",
    );
  });
});
