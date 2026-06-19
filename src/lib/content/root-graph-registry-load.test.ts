import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTENT_ROOT } from "@/lib/content/content-paths";
import {
  clearRegisteredGraphRecords,
  getGraphById,
} from "@/lib/content/graph-registry-runtime";
import { syncGraphRegistryForContentRoot } from "@/lib/content/root-graph-registry-load";
import { graphRecordSchema } from "@/lib/content/schemas";

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

  test("restores canonical root graph records after syncing an alternate content root", () => {
    const rootRecord = getGraphById("graph.gpt-3-architecture");
    expect(rootRecord).toBeDefined();

    const contentRoot = createTempContentRoot();
    writeFileSync(
      join(contentRoot, "registry", "graphs", "gpt-3-architecture.json"),
      `${JSON.stringify(
        graphRecordSchema.parse({
          ...rootRecord,
          nodes: [
            ...(rootRecord?.nodes ?? []),
            {
              id: "fixture-override-node",
              labelKey: "graph.fixture-override-node.label",
              moduleKind: "input",
              childNodeIds: [],
            },
          ],
        }),
        null,
        2,
      )}\n`,
      "utf8",
    );

    syncGraphRegistryForContentRoot(contentRoot);
    expect(
      getGraphById("graph.gpt-3-architecture")?.nodes.map((node) => node.id),
    ).toContain("fixture-override-node");

    syncGraphRegistryForContentRoot(CONTENT_ROOT);
    expect(
      getGraphById("graph.gpt-3-architecture")?.nodes.map((node) => node.id),
    ).not.toContain("fixture-override-node");
  });

  test("loads governed graph metadata from alternate content roots without requiring legacy records to opt in", () => {
    const contentRoot = createTempContentRoot();
    writeFileSync(
      join(contentRoot, "registry", "graphs", "governed-graph.json"),
      `${JSON.stringify(
        {
          ...JSON.parse(
            createGraphRecordJson("graph.governed-example", "governed-graph"),
          ),
          governance: {
            mode: "shared-v1",
            family: {
              id: "concept-map",
            },
            posture: {
              kind: "baseline",
            },
            narrativeCenter: {
              kind: "node",
              targetId: "node-a",
            },
            framing: {
              direction: "top-to-bottom",
              isDefaultDirection: true,
            },
            title: {
              requirement: "required",
            },
            legend: {
              requirement: "optional",
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    syncGraphRegistryForContentRoot(contentRoot);

    const governedGraph = getGraphById("graph.governed-example");
    expect(governedGraph?.governance?.family.id).toBe("concept-map");
    expect(governedGraph?.governance?.title.requirement).toBe("required");

    syncGraphRegistryForContentRoot(CONTENT_ROOT);
    expect(getGraphById("graph.token-concept-map")?.governance).toBeUndefined();
  });
});
