import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";
import {
  assertSupportedSidebarGroupingResolverId,
  buildGroupedSidebarNodes,
} from "@/lib/navigation/docs-sidebar-grouping-adapter";

function getSeparatorLabels(nodes: Node[]): string[] {
  return nodes
    .filter((node) => node.type === "separator")
    .map((node) => String(node.name));
}

describe("docs sidebar grouping adapter", () => {
  test("builds grouped nodes for every configured sidebar grouping resolver id", () => {
    for (const definition of listDocsCollectionDefinitions()) {
      const resolverId = definition.sidebarGroupingResolverId;
      if (!resolverId) {
        continue;
      }

      const pages = loadPublishedDocsPagesSync("en").filter((page) =>
        page.docsSlug.startsWith(`${definition.routeSlug}/`),
      );
      const nodes = buildGroupedSidebarNodes(resolverId, pages);

      expect(nodes.length).toBeGreaterThan(0);
      expect(getSeparatorLabels(nodes).length).toBeGreaterThan(0);
    }
  });

  test("rejects unsupported resolver ids at runtime", () => {
    expect(() => assertSupportedSidebarGroupingResolverId("models")).toThrow(
      /Unsupported docs sidebar grouping resolver id: models/,
    );
    expect(() =>
      buildGroupedSidebarNodes(
        "models" as Parameters<typeof buildGroupedSidebarNodes>[0],
        [],
      ),
    ).toThrow(/Unsupported docs sidebar grouping resolver id: models/);
  });
});
