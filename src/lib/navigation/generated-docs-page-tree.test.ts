import { describe, expect, test } from "bun:test";
import type { Node } from "fumadocs-core/page-tree";
import {
  getSidebarGroupIdsForSection,
  getSidebarGroupLabel,
  type SidebarGroupingSection,
} from "@/lib/content/sidebar-grouping";
import { source } from "@/lib/source";

const REQUIRED_SUBGROUP_LABELS = {
  Glossary: [
    "Model Taxonomy",
    "Sequence And Attention",
    "Math And Training",
    "Generation And Diffusion",
  ],
  Concepts: ["Long Context", "Architecture"],
  Modules: ["Attention Foundations", "Attention Variants"],
  Training: ["Alignment", "Distillation"],
  Systems: ["Memory", "Routing"],
} as const;

const REPRESENTATIVE_SUBGROUP_PLACEMENTS = [
  {
    folderName: "Glossary",
    separator: "Math And Training",
    url: "/docs/glossary/entropy",
  },
  {
    folderName: "Glossary",
    separator: "Sequence And Attention",
    url: "/docs/glossary/token",
  },
  {
    folderName: "Glossary",
    separator: "Generation And Diffusion",
    url: "/docs/glossary/denoising-generation",
  },
  {
    folderName: "Concepts",
    separator: "Architecture",
    url: "/docs/concepts/transformer-architecture",
  },
  {
    folderName: "Concepts",
    separator: "Reference Samples",
    url: "/docs/concepts/page-spec-workflow-sample",
  },
  {
    folderName: "Modules",
    separator: "Attention Foundations",
    url: "/docs/modules/multi-head-attention",
  },
  {
    folderName: "Modules",
    separator: "Attention Variants",
    url: "/docs/modules/grouped-query-attention",
  },
  {
    folderName: "Modules",
    separator: "Feed-Forward And Activation",
    url: "/docs/modules/relu",
  },
  {
    folderName: "Training",
    separator: "Alignment",
    url: "/docs/training/dpo",
  },
  {
    folderName: "Training",
    separator: "Distillation",
    url: "/docs/training/on-policy-distillation",
  },
  {
    folderName: "Training",
    separator: "Optimization",
    url: "/docs/training/fp4-quantization-aware-training",
  },
  {
    folderName: "Systems",
    separator: "Memory",
    url: "/docs/systems/on-disk-kv-cache",
  },
  {
    folderName: "Systems",
    separator: "Routing",
    url: "/docs/systems/routing",
  },
] as const;

const REPRESENTATIVE_SUBGROUP_ORDERING = [
  {
    folderName: "Glossary",
    earlier: "Model Taxonomy",
    later: "Sequence And Attention",
  },
  {
    folderName: "Glossary",
    earlier: "Sequence And Attention",
    later: "Math And Training",
  },
  {
    folderName: "Glossary",
    earlier: "Math And Training",
    later: "Generation And Diffusion",
  },
  {
    folderName: "Modules",
    earlier: "Attention Foundations",
    later: "Attention Variants",
  },
  {
    folderName: "Modules",
    earlier: "Attention Variants",
    later: "Feed-Forward And Activation",
  },
  {
    folderName: "Training",
    earlier: "Alignment",
    later: "Distillation",
  },
  {
    folderName: "Systems",
    earlier: "Memory",
    later: "Routing",
  },
] as const;

const GROUPED_SECTION_BY_FOLDER = {
  Glossary: "glossary",
  Concepts: "concepts",
  Modules: "modules",
  Training: "training",
  Systems: "systems",
} as const satisfies Record<
  keyof typeof REQUIRED_SUBGROUP_LABELS,
  SidebarGroupingSection
>;

function getFolderChildren(folderName: string): Node[] {
  const folder = source.pageTree.children.find(
    (node) => node.type === "folder" && node.name === folderName,
  );
  expect(folder?.type).toBe("folder");
  if (folder?.type !== "folder") {
    throw new Error(`expected ${folderName} folder in docs sidebar`);
  }

  return folder.children;
}

function getSeparatorLabels(nodes: Node[]): string[] {
  return nodes
    .filter((node) => node.type === "separator")
    .map((node) => String(node.name));
}

function findNodeIndex(
  nodes: Node[],
  target: { name?: string; url?: string },
): number {
  return nodes.findIndex((node) => {
    if (target.name) {
      return node.name === target.name;
    }

    return node.type === "page" && "url" in node && node.url === target.url;
  });
}

function expectIndex(targetLabel: string, index: number): number {
  if (index < 0) {
    throw new Error(`expected page tree entry for ${targetLabel}`);
  }

  return index;
}

function expectSeparatorsInConfiguredOrder(
  section: SidebarGroupingSection,
  actualLabels: string[],
): void {
  const configuredLabels = getSidebarGroupIdsForSection(section).map(
    (groupId) => getSidebarGroupLabel(section, groupId),
  );
  const actualConfiguredLabels = actualLabels.filter((label) =>
    configuredLabels.includes(label as (typeof configuredLabels)[number]),
  );
  const expectedOrder = configuredLabels.filter((label) =>
    actualLabels.includes(label),
  );

  expect(
    actualConfiguredLabels,
    `${section} subgroup labels should follow configured order`,
  ).toEqual(expectedOrder);
}

describe("generated docs page tree", () => {
  test("grouped docs folders expose required subgroup labels in configured order", () => {
    for (const [folderName, requiredLabels] of Object.entries(
      REQUIRED_SUBGROUP_LABELS,
    )) {
      const actualLabels = getSeparatorLabels(getFolderChildren(folderName));

      for (const requiredLabel of requiredLabels) {
        expect(
          actualLabels,
          `${folderName} should expose subgroup separator ${requiredLabel}`,
        ).toContain(requiredLabel);
      }

      expectSeparatorsInConfiguredOrder(
        GROUPED_SECTION_BY_FOLDER[
          folderName as keyof typeof GROUPED_SECTION_BY_FOLDER
        ],
        actualLabels,
      );
    }
  });

  test("representative subgroup pages appear after the correct separator", () => {
    for (const placement of REPRESENTATIVE_SUBGROUP_PLACEMENTS) {
      const children = getFolderChildren(placement.folderName);
      const separatorIndex = expectIndex(
        `${placement.folderName} separator ${placement.separator}`,
        findNodeIndex(children, { name: placement.separator }),
      );
      const pageIndex = expectIndex(
        `${placement.folderName} representative page ${placement.url}`,
        findNodeIndex(children, { url: placement.url }),
      );

      expect(
        pageIndex,
        `${placement.folderName} ${placement.separator}`,
      ).toBeGreaterThan(separatorIndex);
    }
  });

  test("representative subgroup separators keep configured relative order", () => {
    for (const ordering of REPRESENTATIVE_SUBGROUP_ORDERING) {
      const children = getFolderChildren(ordering.folderName);
      const earlierIndex = expectIndex(
        `${ordering.folderName} separator ${ordering.earlier}`,
        findNodeIndex(children, { name: ordering.earlier }),
      );
      const laterIndex = expectIndex(
        `${ordering.folderName} separator ${ordering.later}`,
        findNodeIndex(children, { name: ordering.later }),
      );

      expect(
        earlierIndex,
        `${ordering.folderName} should place ${ordering.earlier} before ${ordering.later}`,
      ).toBeLessThan(laterIndex);
    }
  });
});
