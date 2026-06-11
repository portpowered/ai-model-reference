import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const templateRoot = join(process.cwd(), "docs/templates");

type TemplateKind =
  | "model"
  | "paper"
  | "concept"
  | "training-regime"
  | "glossary";

const nonModuleTemplates: Array<{
  kind: TemplateKind;
  graphAssetId?: string;
  graphSectionId?: string;
  openingSummaryInMdx: boolean;
}> = [
  {
    kind: "model",
    graphAssetId: "architectureGraph",
    graphSectionId: "architecture",
    openingSummaryInMdx: true,
  },
  {
    kind: "paper",
    graphAssetId: "contributionGraph",
    graphSectionId: "method-or-architecture",
    openingSummaryInMdx: true,
  },
  {
    kind: "concept",
    graphAssetId: "conceptMap",
    graphSectionId: "where-it-appears",
    openingSummaryInMdx: true,
  },
  {
    kind: "training-regime",
    graphAssetId: "trainingFlow",
    graphSectionId: "how-it-works",
    openingSummaryInMdx: true,
  },
  {
    kind: "glossary",
    graphAssetId: "conceptMap",
    openingSummaryInMdx: false,
  },
];

function readTemplate(kind: TemplateKind): string {
  return readFileSync(join(templateRoot, `${kind}.mdx`), "utf8");
}

function readStarterMessages(kind: TemplateKind): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(templateRoot, `${kind}.messages.en.json`), "utf8"),
  ) as Record<string, unknown>;
}

describe("non-module page template convergence", () => {
  for (const config of nonModuleTemplates) {
    const { kind, graphAssetId, graphSectionId, openingSummaryInMdx } =
      config as {
        kind: TemplateKind;
        graphAssetId?: string;
        graphSectionId?: string;
        openingSummaryInMdx: boolean;
      };

    test(`${kind}.mdx follows writing and graphing standards`, () => {
      const template = readTemplate(kind);

      expect(template).not.toContain('# <T k="title" />');
      expect(template).not.toContain('<T k="problemStatement" />');
      expect(template).not.toContain('<T k="coreIdea" />');
      expect(template).not.toContain("callouts.readerShortcut");

      if (openingSummaryInMdx) {
        expect(template).toContain("<FoldedSummary />");
      } else {
        expect(template).not.toContain('<T k="openingSummary" />');
        expect(template).not.toContain("<GlossaryOpening />");
      }

      if (graphAssetId) {
        expect(template).toContain(`assetId="${graphAssetId}"`);
        if (graphSectionId) {
          const sectionStart = template.indexOf(`id="${graphSectionId}"`);
          const graphIndex = template.indexOf(`assetId="${graphAssetId}"`);
          expect(sectionStart).toBeGreaterThanOrEqual(0);
          expect(graphIndex).toBeGreaterThan(sectionStart);
        } else {
          expect(template).not.toContain('id="where-it-appears"');
        }
      }
    });

    test(`${kind} starter messages use folded summary and omit reader shortcuts`, () => {
      const messages = readStarterMessages(kind);

      expect("openingSummary" in messages).toBe(true);
      expect(messages.problemStatement).toBeUndefined();
      expect(messages.coreIdea).toBeUndefined();
      expect(
        (messages.callouts as { readerShortcut?: unknown } | undefined)
          ?.readerShortcut,
      ).toBeUndefined();
    });
  }
});
