import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parsePageAssetConfig, validatePageAssetReferences } from "./assets";
import {
  getConceptsDocsRoot,
  getContentRoot,
  getGlossaryDocsRoot,
  getModelsDocsRoot,
  getModulesDocsRoot,
  getPapersDocsRoot,
  getProjectRoot,
  getRegistryRoot,
  getSystemsDocsRoot,
  getTrainingDocsRoot,
} from "./content-paths";
import type { GraphRegistryArtifact } from "./generate-page-bundle-graphs";
import { buildGraphRegistryArtifacts } from "./generate-page-bundle-graphs";
import {
  collectDeprecatedTaxonomyWarnings,
  deriveDefaultSummaryKey,
  deriveDefaultTitleKey,
  derivePageFrontmatter,
  type ModulePageSpec,
  type PageSpec,
  type PageSpecKind,
  type PageSpecWarning,
  registryIdForPageSpec,
  registryKindForPageSpec,
  validatePageSpec,
} from "./page-spec";
import {
  type PageAssetConfig,
  type PageMessages,
  pageMessagesSchema,
} from "./schemas";
import { validateGeneratedCanonicalDocs } from "./validate-generated-canonical-docs";

export type GeneratePageBundleInput = {
  spec: PageSpec | unknown;
  dryRun?: boolean;
  projectRoot?: string;
  /** ISO date (`YYYY-MM-DD`) for frontmatter `updatedAt`; defaults to UTC today. */
  updatedAt?: string;
};

export type PlannedBundleFile = {
  path: string;
  label: string;
};

export type GeneratePageBundleResult = {
  registryId: string;
  route: string;
  plannedFiles: PlannedBundleFile[];
  writtenFiles: string[];
  warnings: PageSpecWarning[];
};

export type PageBundleArtifacts = {
  spec: PageSpec;
  registryId: string;
  route: string;
  paths: ReturnType<typeof resolvePageBundlePaths>;
  pageMdx: string;
  messages: PageMessages;
  messagesJson: string;
  assets: PageAssetConfig;
  assetsJson: string;
  registryRecord: Record<string, unknown>;
  registryJson: string;
  graphRegistryArtifacts: GraphRegistryArtifact[];
};

const TEMPLATE_ROOT_SEGMENTS = ["docs", "templates"] as const;

const registryDirectoryByKind: Record<
  ReturnType<typeof registryKindForPageSpec>,
  string
> = {
  concept: "concepts",
  module: "modules",
  model: "models",
  paper: "papers",
  system: "systems",
  "training-regime": "training-regimes",
};

const templateRegistryIdByKind: Record<PageSpecKind, string> = {
  concept: "concept.example-concept",
  glossary: "concept.example-glossary",
  module: "module.example-module",
  model: "model.example-model",
  paper: "paper.example-paper",
  system: "system.example-system",
  "training-regime": "training-regime.example-training-regime",
};

const templateAssetIdReplacementsByKind: Record<
  PageSpecKind,
  Record<string, (slug: string) => string>
> = {
  concept: {
    "graph.example-concept-map": (slug) => `graph.${slug}-concept-map`,
  },
  glossary: {
    "graph.example-glossary-map": (slug) => `graph.${slug}-concept-map`,
  },
  module: {
    "graph.example-module-compute-flow": (slug) => `graph.${slug}-compute-flow`,
    "table.example-module-comparison": (slug) => `table.${slug}-comparison`,
  },
  model: {
    "graph.example-model-architecture": (slug) => `graph.${slug}-architecture`,
  },
  paper: {
    "graph.example-paper-contribution": (slug) => `graph.${slug}-contribution`,
  },
  system: {
    "graph.example-system-flow": (slug) => `graph.${slug}-system-flow`,
  },
  "training-regime": {
    "graph.example-training-flow": (slug) => `graph.${slug}-training-flow`,
  },
};

export class GeneratePageBundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeneratePageBundleError";
  }
}

const defaultModulePrimaryClassificationByType: Partial<
  Record<NonNullable<ModulePageSpec["moduleType"]>, string>
> = {
  attention: "classification.module.attention",
  normalization: "classification.module.normalization",
  "feed-forward": "classification.module.feed-forward",
  activation: "classification.module.activation",
  "position-encoding": "classification.module.positional-encoding",
  tokenizer: "classification.module.tokenization",
};

function isoDateUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function registryTimestampForUpdatedAt(updatedAt: string): string {
  if (updatedAt.includes("T")) {
    return updatedAt;
  }
  return `${updatedAt}T00:00:00.000Z`;
}

function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function serializeYamlList(key: string, values: string[]): string[] {
  if (values.length === 0) {
    return [`${key}:`];
  }
  return [`${key}:`, ...values.map((value) => `  - ${yamlQuote(value)}`)];
}

function docsParentForSpec(spec: PageSpec, docsRoot: string): string {
  switch (spec.kind) {
    case "glossary":
      return getGlossaryDocsRoot(docsRoot);
    case "concept":
      return getConceptsDocsRoot(docsRoot);
    case "module":
      return getModulesDocsRoot(docsRoot);
    case "model":
      return getModelsDocsRoot(docsRoot);
    case "paper":
      return getPapersDocsRoot(docsRoot);
    case "system":
      return getSystemsDocsRoot(docsRoot);
    case "training-regime":
      return getTrainingDocsRoot(docsRoot);
  }
}

function routeForSpec(spec: PageSpec): string {
  switch (spec.kind) {
    case "glossary":
      return `/docs/glossary/${spec.slug}`;
    case "concept":
      return `/docs/concepts/${spec.slug}`;
    case "module":
      return `/docs/modules/${spec.slug}`;
    case "model":
      return `/docs/models/${spec.slug}`;
    case "paper":
      return `/docs/papers/${spec.slug}`;
    case "system":
      return `/docs/systems/${spec.slug}`;
    case "training-regime":
      return `/docs/training/${spec.slug}`;
  }
}

function assetIdReplacementsForSpec(spec: PageSpec): Record<string, string> {
  const replacements: Record<string, string> = {};
  const templateAssetIdReplacements =
    templateAssetIdReplacementsByKind[spec.kind] ?? {};

  for (const [templateId, buildReplacement] of Object.entries(
    templateAssetIdReplacements,
  )) {
    replacements[templateId] = buildReplacement(spec.slug);
  }
  return replacements;
}

function applyTemplateSubstitutions(content: string, spec: PageSpec): string {
  const registryId = registryIdForPageSpec(spec);
  let result = content.replaceAll(
    templateRegistryIdByKind[spec.kind],
    registryId,
  );

  for (const [from, to] of Object.entries(assetIdReplacementsForSpec(spec))) {
    result = result.replaceAll(from, to);
  }

  return result;
}

function buildYamlFrontmatter(spec: PageSpec, updatedAt: string): string {
  const frontmatter = derivePageFrontmatter(spec, updatedAt);
  const lines: string[] = [];

  lines.push(`title: ${yamlQuote(spec.title)}`);
  lines.push(`description: ${yamlQuote(spec.summary)}`);
  lines.push(`kind: ${yamlQuote(frontmatter.kind)}`);
  lines.push(`registryId: ${yamlQuote(frontmatter.registryId)}`);
  lines.push(`messageNamespace: ${yamlQuote(frontmatter.messageNamespace)}`);
  lines.push(`assetNamespace: ${yamlQuote(frontmatter.assetNamespace)}`);
  lines.push(`status: ${yamlQuote(frontmatter.status)}`);
  lines.push(...serializeYamlList("tags", frontmatter.tags));

  if (frontmatter.aliases && frontmatter.aliases.length > 0) {
    lines.push(...serializeYamlList("aliases", frontmatter.aliases));
  }

  lines.push(`updatedAt: ${yamlQuote(frontmatter.updatedAt)}`);
  return lines.join("\n");
}

function buildPageMdx(
  templateMdx: string,
  spec: PageSpec,
  updatedAt: string,
): string {
  const match = templateMdx.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match?.[2]) {
    throw new GeneratePageBundleError(
      "Template page.mdx is missing frontmatter",
    );
  }

  const frontmatter = buildYamlFrontmatter(spec, updatedAt);
  const body = applyTemplateSubstitutions(match[2], spec);
  return `---\n${frontmatter}\n---\n\n${body}`;
}

function mergeRecordSection<T extends Record<string, unknown>>(
  base: Record<string, T> | undefined,
  overrides: Record<string, T> | undefined,
): Record<string, T> | undefined {
  if (!overrides) {
    return base;
  }
  const merged: Record<string, T> = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = { ...(merged[key] ?? {}), ...value };
  }
  return merged;
}

function fillEmptyDraftStrings(value: unknown, draftNote: string): unknown {
  if (typeof value === "string") {
    return value.length === 0 ? draftNote : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => fillEmptyDraftStrings(item, draftNote));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        fillEmptyDraftStrings(nested, draftNote),
      ]),
    );
  }
  return value;
}

function buildPageMessages(
  templateMessages: Record<string, unknown>,
  spec: PageSpec,
): Record<string, unknown> {
  const messages: Record<string, unknown> = {
    ...templateMessages,
    title: spec.title,
    description: spec.summary,
  };

  const mergedSections = mergeRecordSection(
    templateMessages.sections as
      | Record<string, Record<string, unknown>>
      | undefined,
    spec.sections as Record<string, Record<string, unknown>> | undefined,
  );
  if (mergedSections) {
    messages.sections = mergedSections;
  }

  const mergedCallouts = mergeRecordSection(
    templateMessages.callouts as
      | Record<string, Record<string, unknown>>
      | undefined,
    spec.callouts as Record<string, Record<string, unknown>> | undefined,
  );
  if (mergedCallouts) {
    messages.callouts = mergedCallouts;
  }

  if (spec.graph) {
    const templateGraph = (templateMessages.graph ?? {}) as {
      nodes?: Record<string, unknown>;
    };
    const graphNodes = spec.graph.nodes as Record<string, unknown>;
    messages.graph = {
      ...templateGraph,
      nodes: {
        ...(templateGraph.nodes ?? {}),
        ...graphNodes,
      },
    };
  }

  if (spec.tables) {
    const mergedTables = mergeRecordSection(
      templateMessages.tables as
        | Record<string, Record<string, unknown>>
        | undefined,
      spec.tables as Record<string, Record<string, unknown>>,
    );
    if (mergedTables) {
      messages.tables = mergedTables;
    }
  }

  if (spec.assetMessages) {
    const mergedAssets = mergeRecordSection(
      messages.assets as Record<string, Record<string, unknown>> | undefined,
      spec.assetMessages as Record<string, Record<string, unknown>>,
    );
    if (mergedAssets) {
      messages.assets = mergedAssets;
    }
  }

  const draftNote = `Draft placeholder for ${spec.title}. Replace before publishing.`;
  const filled = fillEmptyDraftStrings(messages, draftNote) as Record<
    string,
    unknown
  >;
  filled.title = spec.title;
  filled.description = spec.summary;

  return filled;
}

function buildPageAssetsJson(
  templateAssetsRaw: string,
  spec: PageSpec,
): string {
  const substituted = applyTemplateSubstitutions(templateAssetsRaw, spec);
  const templateAssets = JSON.parse(substituted) as Record<string, unknown>;

  if (spec.assets && Object.keys(spec.assets).length > 0) {
    const merged = { ...templateAssets, ...spec.assets };
    return `${JSON.stringify(merged, null, 2)}\n`;
  }

  return substituted.endsWith("\n") ? substituted : `${substituted}\n`;
}

function buildRegistryRecord(
  spec: PageSpec,
  timestamp: string,
): Record<string, unknown> {
  const ontologyFirstFields =
    "primaryClassificationId" in spec
      ? {
          ...(spec.primaryClassificationId
            ? { primaryClassificationId: spec.primaryClassificationId }
            : {}),
          ...(spec.secondaryClassificationIds.length > 0
            ? { secondaryClassificationIds: spec.secondaryClassificationIds }
            : {}),
          ...(spec.relationships.length > 0
            ? { relationships: spec.relationships }
            : {}),
        }
      : {};

  const base = {
    id: registryIdForPageSpec(spec),
    slug: spec.slug,
    kind: registryKindForPageSpec(spec),
    defaultTitleKey: deriveDefaultTitleKey(),
    defaultSummaryKey: deriveDefaultSummaryKey(),
    aliases: spec.aliases,
    tags: spec.tags,
    relatedIds: spec.relatedIds,
    citationIds: spec.citationIds,
    status: spec.status,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...ontologyFirstFields,
  };

  switch (spec.kind) {
    case "concept":
    case "glossary":
      return {
        ...base,
        ...(spec.releaseDate ? { releaseDate: spec.releaseDate } : {}),
        ...(spec.authors ? { authors: spec.authors } : {}),
        ...(spec.sourceId ? { sourceId: spec.sourceId } : {}),
        // Deprecated typed taxonomy fields remain compatibility-only inputs.
        ...(spec.conceptType ? { conceptType: spec.conceptType } : {}),
        prerequisiteIds: spec.prerequisiteIds,
        explainsIds: spec.explainsIds,
      };
    case "module": {
      const primaryClassificationId =
        spec.primaryClassificationId ??
        (spec.moduleType
          ? defaultModulePrimaryClassificationByType[spec.moduleType]
          : undefined);
      if (!primaryClassificationId) {
        throw new GeneratePageBundleError(
          `Module page specs with moduleType "${spec.moduleType}" must declare primaryClassificationId until the ontology mapping is defined for that module type.`,
        );
      }

      return {
        ...base,
        ...(spec.releaseDate ? { releaseDate: spec.releaseDate } : {}),
        ...(spec.authors ? { authors: spec.authors } : {}),
        ...(spec.sourceId ? { sourceId: spec.sourceId } : {}),
        primaryClassificationId,
        mathLevel: spec.mathLevel,
        optimizes: spec.optimizes,
        exampleModelIds: spec.exampleModelIds,
        improvesOnIds: spec.improvesOnIds,
        tradeoffIds: spec.tradeoffIds,
        usedByModelIds: spec.usedByModelIds,
        introducedByPaperIds: spec.introducedByPaperIds,
        ...(spec.moduleType ? { moduleType: spec.moduleType } : {}),
        ...(spec.moduleFamily ? { moduleFamily: spec.moduleFamily } : {}),
        ...(spec.variantGroup ? { variantGroup: spec.variantGroup } : {}),
        ...(spec.variantOf ? { variantOf: spec.variantOf } : {}),
      };
    }
    case "model":
      return {
        ...base,
        ...(spec.releaseDate ? { releaseDate: spec.releaseDate } : {}),
        ...(spec.authors ? { authors: spec.authors } : {}),
        ...(spec.sourceId ? { sourceId: spec.sourceId } : {}),
        family: spec.family,
        sourceType: spec.sourceType,
        modalities: spec.modalities,
        architectureIds: spec.architectureIds,
        moduleIds: spec.moduleIds,
        trainingRegimeIds: spec.trainingRegimeIds,
        datasetIds: spec.datasetIds,
        paperIds: spec.paperIds,
        ...(spec.organizationId ? { organizationId: spec.organizationId } : {}),
        ...(spec.parameterCount ? { parameterCount: spec.parameterCount } : {}),
        ...(spec.activeParameterCount
          ? { activeParameterCount: spec.activeParameterCount }
          : {}),
        ...(spec.contextLength ? { contextLength: spec.contextLength } : {}),
        ...(spec.precision ? { precision: spec.precision } : {}),
      };
    case "paper":
      return {
        ...base,
        authors: spec.authors,
        publishedAt: spec.publishedAt,
        url: spec.url,
        introducesIds: spec.introducesIds,
        supportsIds: spec.supportsIds,
        arguesAgainstIds: spec.arguesAgainstIds,
        modelIds: spec.modelIds,
        moduleIds: spec.moduleIds,
        conceptIds: spec.conceptIds,
        ...(spec.venue ? { venue: spec.venue } : {}),
        ...(spec.arxivId ? { arxivId: spec.arxivId } : {}),
      };
    case "training-regime":
      return {
        ...base,
        ...(spec.releaseDate ? { releaseDate: spec.releaseDate } : {}),
        ...(spec.authors ? { authors: spec.authors } : {}),
        ...(spec.sourceId ? { sourceId: spec.sourceId } : {}),
        usedByModelIds: spec.usedByModelIds,
        relatedModuleIds: spec.relatedModuleIds,
        paperIds: spec.paperIds,
        ...(spec.regimeType ? { regimeType: spec.regimeType } : {}),
        ...(spec.conceptType ? { conceptType: spec.conceptType } : {}),
        ...(spec.variantGroup ? { variantGroup: spec.variantGroup } : {}),
      };
    case "system":
      return {
        ...base,
        ...(spec.releaseDate ? { releaseDate: spec.releaseDate } : {}),
        ...(spec.authors ? { authors: spec.authors } : {}),
        ...(spec.sourceId ? { sourceId: spec.sourceId } : {}),
        relatedModelIds: spec.relatedModelIds,
        relatedModuleIds: spec.relatedModuleIds,
        relatedConceptIds: spec.relatedConceptIds,
        paperIds: spec.paperIds,
        datasetIds: spec.datasetIds,
        ...(spec.organizationId ? { organizationId: spec.organizationId } : {}),
        ...(spec.systemType ? { systemType: spec.systemType } : {}),
        ...(spec.conceptType ? { conceptType: spec.conceptType } : {}),
        ...(spec.variantGroup ? { variantGroup: spec.variantGroup } : {}),
      };
  }
}

async function readTemplateFile(
  projectRoot: string,
  kind: PageSpecKind,
  fileName: string,
): Promise<string> {
  const templatePath = join(
    projectRoot,
    ...TEMPLATE_ROOT_SEGMENTS,
    fileName.replace("<kind>", kind),
  );
  return readFile(templatePath, "utf8");
}

async function assertPathDoesNotExist(path: string): Promise<void> {
  try {
    await access(path);
    throw new GeneratePageBundleError(
      `Refusing to overwrite existing path: ${path}`,
    );
  } catch (error) {
    if (
      error instanceof GeneratePageBundleError ||
      (error &&
        typeof error === "object" &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code !== "ENOENT")
    ) {
      throw error;
    }
  }
}

function formatUnresolvedReferenceMessage(
  issues: Array<{ message: string }>,
): string {
  const details = issues.map((issue) => issue.message).join("; ");
  return `Unresolved reference: ${details}`;
}

function assertGeneratedBundleReferences(artifacts: PageBundleArtifacts): void {
  const assetIssues = validatePageAssetReferences(
    artifacts.assets,
    artifacts.messages,
  );
  if (assetIssues.length > 0) {
    throw new GeneratePageBundleError(
      formatUnresolvedReferenceMessage(assetIssues),
    );
  }

  const graphIdsFromAssets = new Set(
    Object.values(artifacts.assets)
      .filter((asset) => asset.type === "graph")
      .map((asset) => asset.graphId),
  );
  const graphIdsFromArtifacts = new Set(
    artifacts.graphRegistryArtifacts.map((artifact) => artifact.graphId),
  );
  for (const graphId of graphIdsFromAssets) {
    if (!graphIdsFromArtifacts.has(graphId)) {
      throw new GeneratePageBundleError(
        `Unresolved reference: missing graph registry record for ${graphId}`,
      );
    }
  }

  const mdxIssues = validateGeneratedCanonicalDocs({
    pagePath: artifacts.paths.pagePath,
    kind: artifacts.spec.kind,
    mdxSource: artifacts.pageMdx,
    messages: artifacts.messages,
    assets: artifacts.assets,
  });
  if (mdxIssues.length > 0) {
    throw new GeneratePageBundleError(
      mdxIssues.map((issue) => issue.message).join("; "),
    );
  }
}

export function resolvePageBundlePaths(
  spec: PageSpec,
  projectRoot = getProjectRoot(),
): {
  registryPath: string;
  pageDir: string;
  pagePath: string;
  messagesPath: string;
  assetsPath: string;
} {
  const contentRoot = getContentRoot(projectRoot);
  const docsRoot = join(contentRoot, "docs");
  const registryKind = registryKindForPageSpec(spec);
  const registryPath = join(
    getRegistryRoot(contentRoot),
    registryDirectoryByKind[registryKind],
    `${spec.slug}.json`,
  );
  const pageDir = join(docsParentForSpec(spec, docsRoot), spec.slug);
  return {
    registryPath,
    pageDir,
    pagePath: join(pageDir, "page.mdx"),
    messagesPath: join(pageDir, "messages", "en.json"),
    assetsPath: join(pageDir, "assets.json"),
  };
}

export async function buildPageBundleArtifacts(input: {
  spec: PageSpec;
  projectRoot?: string;
  updatedAt?: string;
}): Promise<PageBundleArtifacts> {
  const projectRoot = input.projectRoot ?? getProjectRoot();
  const updatedAt = input.updatedAt ?? isoDateUtc();
  const spec = input.spec;
  const registryId = registryIdForPageSpec(spec);
  const paths = resolvePageBundlePaths(spec, projectRoot);

  const [templateMdx, templateMessagesRaw, templateAssetsRaw] =
    await Promise.all([
      readTemplateFile(projectRoot, spec.kind, "<kind>.mdx"),
      readTemplateFile(projectRoot, spec.kind, "<kind>.messages.en.json"),
      readTemplateFile(projectRoot, spec.kind, "<kind>.assets.json"),
    ]);

  const pageMdx = buildPageMdx(templateMdx, spec, updatedAt);
  const templateMessages = JSON.parse(templateMessagesRaw) as Record<
    string,
    unknown
  >;
  const messagesRecord = buildPageMessages(templateMessages, spec);
  const messages = pageMessagesSchema.parse(messagesRecord);
  const assetsJson = buildPageAssetsJson(templateAssetsRaw, spec);
  const assets = parsePageAssetConfig(JSON.parse(assetsJson));
  const registryRecord = buildRegistryRecord(
    spec,
    registryTimestampForUpdatedAt(updatedAt),
  );
  const timestamp = registryTimestampForUpdatedAt(updatedAt);
  const graphRegistryArtifacts = await buildGraphRegistryArtifacts({
    spec,
    assets,
    timestamp,
    projectRoot,
    applyTemplateSubstitutions,
  });

  return {
    spec,
    registryId,
    route: routeForSpec(spec),
    paths,
    pageMdx,
    messages,
    messagesJson: `${JSON.stringify(messagesRecord, null, 2)}\n`,
    assets,
    assetsJson,
    registryRecord,
    registryJson: `${JSON.stringify(registryRecord, null, 2)}\n`,
    graphRegistryArtifacts,
  };
}

export async function generatePageBundle(
  input: GeneratePageBundleInput,
): Promise<GeneratePageBundleResult> {
  const spec =
    input.spec !== null &&
    typeof input.spec === "object" &&
    "kind" in input.spec
      ? validatePageSpec(input.spec)
      : validatePageSpec(input.spec);

  const projectRoot = input.projectRoot ?? getProjectRoot();
  const paths = resolvePageBundlePaths(spec, projectRoot);
  const registryId = registryIdForPageSpec(spec);

  const artifactsForPlan = await buildPageBundleArtifacts({
    spec,
    projectRoot,
    updatedAt: input.updatedAt,
  });
  const plannedFiles: PlannedBundleFile[] = [
    { path: paths.registryPath, label: "registry record" },
    ...artifactsForPlan.graphRegistryArtifacts.map((artifact) => ({
      path: artifact.path,
      label: `graph registry record (${artifact.graphId})`,
    })),
    { path: paths.pagePath, label: "page.mdx" },
    { path: paths.messagesPath, label: "messages/en.json" },
    { path: paths.assetsPath, label: "assets.json" },
  ];

  if (input.dryRun) {
    return {
      registryId,
      route: routeForSpec(spec),
      plannedFiles,
      writtenFiles: [],
      warnings: collectDeprecatedTaxonomyWarnings(spec),
    };
  }

  for (const file of plannedFiles) {
    await assertPathDoesNotExist(file.path);
  }

  const artifacts = artifactsForPlan;
  assertGeneratedBundleReferences(artifacts);

  await mkdir(join(paths.pageDir, "messages"), { recursive: true });
  await mkdir(join(getRegistryRoot(getContentRoot(projectRoot)), "graphs"), {
    recursive: true,
  });
  await writeFile(paths.registryPath, artifacts.registryJson);
  for (const graphArtifact of artifacts.graphRegistryArtifacts) {
    await writeFile(graphArtifact.path, graphArtifact.json);
  }
  await writeFile(paths.pagePath, artifacts.pageMdx);
  await writeFile(paths.messagesPath, artifacts.messagesJson);
  await writeFile(paths.assetsPath, artifacts.assetsJson);

  return {
    registryId,
    route: routeForSpec(spec),
    plannedFiles,
    writtenFiles: plannedFiles.map((file) => file.path),
    warnings: collectDeprecatedTaxonomyWarnings(spec),
  };
}

export function formatGeneratePageBundlePlan(
  result: GeneratePageBundleResult,
): string {
  const lines = [
    `Registry id: ${result.registryId}`,
    `Route: ${result.route}`,
    ...(result.warnings.length > 0
      ? [
          "Warnings:",
          ...result.warnings.map(
            (warning) => `  - ${warning.field}: ${warning.message}`,
          ),
        ]
      : []),
    "Planned files:",
    ...result.plannedFiles.map((file) => `  - ${file.path} (${file.label})`),
  ];
  if (result.writtenFiles.length > 0) {
    lines.push("Written files:");
    for (const path of result.writtenFiles) {
      lines.push(`  - ${path}`);
    }
  }
  return lines.join("\n");
}
