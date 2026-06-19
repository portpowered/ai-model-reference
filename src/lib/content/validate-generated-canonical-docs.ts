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
  "ModuleChart",
  "ConceptMap",
  "ModelArchitectureGraph",
  "PaperContributionGraph",
  "SystemFlowGraph",
  "TrainingRegimeFlow",
] as const;

type GraphComponentName = (typeof GRAPH_COMPONENT_NAMES)[number];

type GraphPlacementRule = {
  components: readonly GraphComponentName[];
  requiredSectionId?: string;
  forbiddenSectionIds?: readonly string[];
  minPrimaryGraphComponents?: number;
};

const graphPlacementRulesByKind: Partial<Record<PageKind, GraphPlacementRule>> =
  {
    concept: {
      components: ["ConceptMap"],
    },
    glossary: {
      components: ["ConceptMap"],
    },
    module: {
      components: ["ModuleGraph", "ModuleChart"],
      requiredSectionId: "how-it-works",
      forbiddenSectionIds: ["math-or-compute-schema"],
      minPrimaryGraphComponents: 1,
    },
    model: {
      components: ["ModelArchitectureGraph"],
      requiredSectionId: "architecture",
    },
    paper: {
      components: ["PaperContributionGraph"],
      requiredSectionId: "method-or-architecture",
    },
    "training-regime": {
      components: ["TrainingRegimeFlow"],
      requiredSectionId: "how-it-works",
    },
    system: {
      components: ["SystemFlowGraph"],
      requiredSectionId: "how-it-works",
    },
  };

function isGraphAssetType(type: string): boolean {
  return type === "graph" || type === "attention-variant-graph";
}

function matchesSupportedAssetType(
  component: GraphComponentName,
  assetType: string,
): boolean {
  if (component === "ModuleChart") {
    return assetType === "chart";
  }

  return isGraphAssetType(assetType);
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
  const { pagePath, mdxSource, messages } = options;
  const mdxBody = extractMdxBody(mdxSource);
  const messagesPath = pagePath.replace(/page\.mdx$/, "messages/en.json");
  const errors: ValidationError[] = [];
  for (const legacyKey of LEGACY_SUMMARY_MESSAGE_KEYS) {
    if (legacyKey in messages && messages[legacyKey as keyof PageMessages]) {
      errors.push({
        code: "legacy-split-summary-message-key",
        message: `${messagesPath}: generated bundles must not use legacy split summary key "${legacyKey}"`,
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
      message: `${messagesPath}: generated bundles must not include callouts.readerShortcut`,
      path: messagesPath,
    });
  }

  for (const marker of LEGACY_SUMMARY_MDX_MARKERS) {
    if (mdxBody.includes(marker)) {
      errors.push({
        code: "legacy-split-summary-mdx",
        message: `${pagePath}: generated MDX must not include legacy summary marker "${marker}"`,
        path: pagePath,
      });
    }
  }

  if (OPENING_SUMMARY_MDX_MARKERS.some((marker) => mdxBody.includes(marker))) {
    errors.push({
      code: "opening-summary-in-mdx",
      message: `${pagePath}: canonical docs pages must not render openingSummary in MDX`,
      path: pagePath,
    });
  }

  return errors;
}

function sectionMustContain(
  pagePath: string,
  mdxBody: string,
  sectionId: string,
  marker: string,
  code: string,
  label: string,
): ValidationError[] {
  const sectionBody = sectionSlice(mdxBody, sectionId);
  if (!sectionBody) {
    return [];
  }
  if (sectionBody.includes(marker)) {
    return [];
  }
  return [
    {
      code,
      message: `${pagePath}: section id="${sectionId}" must include ${label}`,
      path: pagePath,
    },
  ];
}

export function validateGeneratedKindSpecificStructure(options: {
  pagePath: string;
  kind: PageKind;
  mdxSource: string;
}): ValidationError[] {
  const { pagePath, kind, mdxSource } = options;
  const mdxBody = extractMdxBody(mdxSource);
  const errors: ValidationError[] = [];

  if (kind === "concept") {
    errors.push(
      ...sectionMustContain(
        pagePath,
        mdxBody,
        "related",
        "<RelatedDocs",
        "missing-related-docs-component",
        "RelatedDocs",
      ),
    );
  }

  if (kind === "paper") {
    for (const sectionId of [
      "what-the-paper-introduced",
      "what-it-connects-to",
    ]) {
      if (sectionSlice(mdxBody, sectionId)) {
        errors.push({
          code: "forbidden-duplicate-related-section",
          message: `${pagePath}: paper pages must not include section id="${sectionId}"`,
          path: pagePath,
        });
      }
    }
  }

  if (kind === "paper" || kind === "training-regime" || kind === "system") {
    errors.push(
      ...sectionMustContain(
        pagePath,
        mdxBody,
        "related",
        "<RelatedDocs",
        "missing-related-docs-component",
        "RelatedDocs",
      ),
    );

    for (const forbiddenComponent of [
      "RegistryAssociatedRecords",
      "RegistryDeepLinkList",
      "DerivedRelatedDocs",
    ]) {
      if (mdxBody.includes(`<${forbiddenComponent}`)) {
        errors.push({
          code: "forbidden-duplicate-related-component",
          message: `${pagePath}: ${kind} pages must not include ${forbiddenComponent}; use RelatedDocs in the related section`,
          path: pagePath,
        });
      }
    }
  }

  if (
    kind === "training-regime" &&
    sectionSlice(mdxBody, "models-and-papers")
  ) {
    errors.push({
      code: "forbidden-duplicate-related-section",
      message: `${pagePath}: training-regime pages must not include section id="models-and-papers"`,
      path: pagePath,
    });
  }

  if (kind === "system" && sectionSlice(mdxBody, "associated-records")) {
    errors.push({
      code: "forbidden-duplicate-related-section",
      message: `${pagePath}: system pages must not include section id="associated-records"`,
      path: pagePath,
    });
  }

  if (kind === "training-regime" || kind === "system") {
    if (!mdxBody.includes("<BlockMath") && !mdxBody.includes("$$")) {
      errors.push({
        code: "missing-required-math",
        message: `${pagePath}: ${kind} pages must include at least one formula or BlockMath expression`,
        path: pagePath,
      });
    }
  }

  return errors;
}

export function validateGeneratedAssetRules(options: {
  pagePath: string;
  kind: PageKind;
  assets: PageAssetConfig;
  messages: PageMessages;
}): ValidationError[] {
  const { pagePath, kind, assets, messages } = options;
  const assetsPath = pagePath.replace(/page\.mdx$/, "assets.json");
  const messagesPath = pagePath.replace(/page\.mdx$/, "messages/en.json");
  const errors: ValidationError[] = [];

  if (kind !== "model") {
    return errors;
  }

  for (const [assetId, asset] of Object.entries(assets)) {
    const disallowCaption = asset.type === "graph" || asset.type === "table";

    if (!disallowCaption) {
      continue;
    }

    if ("captionKey" in asset && asset.captionKey) {
      errors.push({
        code: "forbidden-model-asset-caption",
        message: `${assetsPath}: model asset "${assetId}" must not define captionKey`,
        path: assetsPath,
      });
    }

    const caption = messages.assets?.[assetId]?.caption;
    if (caption) {
      errors.push({
        code: "forbidden-model-asset-caption-message",
        message: `${messagesPath}: model asset "${assetId}" must not define caption text`,
        path: messagesPath,
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

  if (rules.minPrimaryGraphComponents !== undefined) {
    const graphCount = matchedComponents.length;
    if (graphCount < rules.minPrimaryGraphComponents) {
      errors.push({
        code: "graph-count-mismatch",
        message: `${pagePath}: ${kind} pages must render at least ${rules.minPrimaryGraphComponents} primary graph component(s); found ${graphCount}`,
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

    if (!matchesSupportedAssetType(component, asset.type)) {
      const requiredType =
        component === "ModuleChart"
          ? 'type "chart"'
          : 'type "graph" or "attention-variant-graph"';
      errors.push({
        code: "graph-asset-type-mismatch",
        message: `${assetsPath}: asset "${assetId}" referenced by ${component} must have ${requiredType}`,
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
    ...validateGeneratedKindSpecificStructure({
      pagePath,
      kind,
      mdxSource,
    }),
    ...validateGeneratedAssetRules({
      pagePath,
      kind,
      assets,
      messages,
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
