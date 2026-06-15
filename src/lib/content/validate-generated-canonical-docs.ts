import type { PageAssetConfig, PageKind, PageMessages } from "./schemas";
import {
  splitMdxFrontmatter,
  validateCanonicalMdxProse,
} from "./validate-canonical-mdx-prose";
import type { ValidationError } from "./validate-registry";

const LEGACY_SUMMARY_MESSAGE_KEYS = ["problemStatement", "coreIdea"] as const;

const LEGACY_SUMMARY_MDX_MARKERS = [
  '<T k="problemStatement"',
  '<T k="coreIdea"',
  "callouts.readerShortcut",
  "<GlossaryOpening",
] as const;

const GRAPH_COMPONENT_NAMES = [
  "ModuleGraph",
  "ConceptMap",
  "ModelArchitectureGraph",
  "PaperContributionGraph",
  "TrainingRegimeFlow",
] as const;

type GraphComponentName = (typeof GRAPH_COMPONENT_NAMES)[number];

type GraphPlacementRule = {
  components: readonly GraphComponentName[];
  requiredSectionId?: string;
  forbiddenSectionIds?: readonly string[];
  maxPrimaryGraphComponents?: number;
  requireOpeningSummaryInMdx: boolean;
};

const graphPlacementRulesByKind: Partial<Record<PageKind, GraphPlacementRule>> =
  {
    concept: {
      components: ["ConceptMap"],
      requiredSectionId: "where-it-appears",
      requireOpeningSummaryInMdx: true,
    },
    glossary: {
      components: ["ConceptMap"],
      requireOpeningSummaryInMdx: false,
    },
    module: {
      components: ["ModuleGraph"],
      requiredSectionId: "how-it-works",
      forbiddenSectionIds: ["math-or-compute-schema"],
      maxPrimaryGraphComponents: 1,
      requireOpeningSummaryInMdx: true,
    },
    model: {
      components: ["ModelArchitectureGraph"],
      requiredSectionId: "architecture",
      requireOpeningSummaryInMdx: true,
    },
    paper: {
      components: ["PaperContributionGraph"],
      requiredSectionId: "method-or-architecture",
      requireOpeningSummaryInMdx: true,
    },
    "training-regime": {
      components: ["TrainingRegimeFlow"],
      requiredSectionId: "how-it-works",
      requireOpeningSummaryInMdx: true,
    },
  };

function isGraphAssetType(type: string): boolean {
  return type === "graph" || type === "attention-variant-graph";
}

function extractMdxBody(mdxSource: string): string {
  return splitMdxFrontmatter(mdxSource).body;
}

function sectionSlice(mdxBody: string, sectionId: string): string | undefined {
  const sectionStart = mdxBody.indexOf(`id="${sectionId}"`);
  if (sectionStart < 0) {
    return undefined;
  }
  const nextSectionStart = mdxBody.indexOf("<Section", sectionStart + 1);
  return nextSectionStart >= 0
    ? mdxBody.slice(sectionStart, nextSectionStart)
    : mdxBody.slice(sectionStart);
}

function findGraphComponentMatches(
  mdxBody: string,
  componentName: GraphComponentName,
): RegExpMatchArray[] {
  const pattern = new RegExp(`<${componentName}\\b[\\s\\S]*?\\/?>`, "g");
  return [...mdxBody.matchAll(pattern)];
}

function extractAssetIdFromComponentTag(tag: string): string | undefined {
  const match = tag.match(/\bassetId="([^"]+)"/);
  return match?.[1];
}

function mdxRendersFoldedSummary(mdxBody: string): boolean {
  return mdxBody.includes("<FoldedSummary />");
}

const OPENING_SUMMARY_MDX_MARKERS = [
  "<FoldedSummary />",
  '<T k="openingSummary" />',
] as const;

export function validateGeneratedFoldedSummary(options: {
  pagePath: string;
  kind: PageKind;
  mdxSource: string;
  messages: PageMessages;
}): ValidationError[] {
  const { pagePath, kind, mdxSource, messages } = options;
  const mdxBody = extractMdxBody(mdxSource);
  const messagesPath = pagePath.replace(/page\.mdx$/, "messages/en.json");
  const errors: ValidationError[] = [];
  const rules = graphPlacementRulesByKind[kind];

  for (const legacyKey of LEGACY_SUMMARY_MESSAGE_KEYS) {
    if (legacyKey in messages && messages[legacyKey as keyof PageMessages]) {
      errors.push({
        code: "legacy-split-summary-message-key",
        message: `${messagesPath}: generated bundles must use folded openingSummary instead of legacy "${legacyKey}" message key`,
        path: messagesPath,
      });
    }
  }

  if (
    messages.callouts &&
    typeof messages.callouts === "object" &&
    "readerShortcut" in messages.callouts
  ) {
    errors.push({
      code: "legacy-reader-shortcut-callout",
      message: `${messagesPath}: generated bundles must not include callouts.readerShortcut; fold summary guidance into openingSummary`,
      path: messagesPath,
    });
  }

  for (const marker of LEGACY_SUMMARY_MDX_MARKERS) {
    if (mdxBody.includes(marker)) {
      errors.push({
        code: "legacy-split-summary-mdx",
        message: `${pagePath}: generated MDX must use folded openingSummary instead of legacy marker "${marker}"`,
        path: pagePath,
      });
    }
  }

  const requiresOpeningSummary = rules?.requireOpeningSummaryInMdx ?? false;
  if (requiresOpeningSummary) {
    if (!mdxRendersFoldedSummary(mdxBody)) {
      errors.push({
        code: "missing-opening-summary-mdx",
        message: `${pagePath}: generated MDX must render folded summary via <FoldedSummary />`,
        path: pagePath,
      });
    }
    if (
      !messages.openingSummary ||
      messages.openingSummary.trim().length === 0
    ) {
      errors.push({
        code: "missing-opening-summary-message",
        message: `${messagesPath}: generated bundles must include non-empty messages.openingSummary for folded summary pattern`,
        path: messagesPath,
      });
    }
  } else if (kind === "glossary") {
    if (
      OPENING_SUMMARY_MDX_MARKERS.some((marker) => mdxBody.includes(marker))
    ) {
      errors.push({
        code: "glossary-opening-summary-in-mdx",
        message: `${pagePath}: glossary pages must not render openingSummary in MDX; use description in frontmatter and messages only`,
        path: pagePath,
      });
    }
  }

  return errors;
}

export function validateGeneratedGraphPlacement(options: {
  pagePath: string;
  kind: PageKind;
  mdxSource: string;
  assets: PageAssetConfig;
}): ValidationError[] {
  const { pagePath, kind, mdxSource, assets } = options;
  const mdxBody = extractMdxBody(mdxSource);
  const assetsPath = pagePath.replace(/page\.mdx$/, "assets.json");
  const rules = graphPlacementRulesByKind[kind];
  if (!rules) {
    return [];
  }

  const errors: ValidationError[] = [];
  const matchedComponents: Array<{
    component: GraphComponentName;
    tag: string;
  }> = [];

  for (const componentName of rules.components) {
    for (const match of findGraphComponentMatches(mdxBody, componentName)) {
      const tag = match[0] ?? "";
      matchedComponents.push({ component: componentName, tag });
    }
  }

  if (rules.maxPrimaryGraphComponents !== undefined) {
    const graphCount = matchedComponents.length;
    if (graphCount !== rules.maxPrimaryGraphComponents) {
      errors.push({
        code: "graph-count-mismatch",
        message: `${pagePath}: ${kind} pages must render exactly ${rules.maxPrimaryGraphComponents} primary graph component(s); found ${graphCount}`,
        path: pagePath,
      });
    }
  }

  for (const { component, tag } of matchedComponents) {
    const assetId = extractAssetIdFromComponentTag(tag);
    if (!assetId) {
      errors.push({
        code: "graph-missing-asset-id",
        message: `${pagePath}: ${component} must reference a graph through assetId instead of inline graph prose`,
        path: pagePath,
      });
      continue;
    }

    const asset = assets[assetId];
    if (!asset) {
      errors.push({
        code: "graph-unknown-asset-id",
        message: `${pagePath}: ${component} references missing asset id "${assetId}"`,
        path: pagePath,
      });
      continue;
    }

    if (!isGraphAssetType(asset.type)) {
      errors.push({
        code: "graph-asset-type-mismatch",
        message: `${assetsPath}: asset "${assetId}" referenced by ${component} must have type "graph" or "attention-variant-graph"`,
        path: assetsPath,
      });
    }
  }

  if (rules.requiredSectionId) {
    const sectionBody = sectionSlice(mdxBody, rules.requiredSectionId);
    if (!sectionBody) {
      errors.push({
        code: "graph-section-missing",
        message: `${pagePath}: expected graph section id="${rules.requiredSectionId}" for ${kind} pages`,
        path: pagePath,
      });
    } else {
      for (const componentName of rules.components) {
        const inSection = findGraphComponentMatches(
          sectionBody,
          componentName,
        ).length;
        if (
          inSection === 0 &&
          matchedComponents.some((entry) => entry.component === componentName)
        ) {
          errors.push({
            code: "graph-wrong-section",
            message: `${pagePath}: ${componentName} must appear inside section id="${rules.requiredSectionId}"`,
            path: pagePath,
          });
        }
      }
    }
  }

  for (const forbiddenSectionId of rules.forbiddenSectionIds ?? []) {
    const forbiddenSection = sectionSlice(mdxBody, forbiddenSectionId);
    if (!forbiddenSection) {
      continue;
    }
    for (const componentName of rules.components) {
      if (
        findGraphComponentMatches(forbiddenSection, componentName).length > 0
      ) {
        errors.push({
          code: "graph-forbidden-section",
          message: `${pagePath}: ${componentName} must not appear inside section id="${forbiddenSectionId}"`,
          path: pagePath,
        });
      }
    }
  }

  return errors;
}

export type ValidateGeneratedCanonicalDocsOptions = {
  pagePath: string;
  kind: PageKind;
  mdxSource: string;
  messages: PageMessages;
  assets: PageAssetConfig;
};

export function validateGeneratedCanonicalDocs(
  options: ValidateGeneratedCanonicalDocsOptions,
): ValidationError[] {
  const { pagePath, kind, mdxSource, messages, assets } = options;

  return [
    ...validateGeneratedFoldedSummary({
      pagePath,
      kind,
      mdxSource,
      messages,
    }),
    ...validateGeneratedGraphPlacement({
      pagePath,
      kind,
      mdxSource,
      assets,
    }),
    ...validateCanonicalMdxProse({
      pagePath,
      kind,
      mdxSource,
      messages,
      assets,
    }),
  ];
}
