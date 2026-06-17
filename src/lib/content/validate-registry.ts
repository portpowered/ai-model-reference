import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
  supportedLocales,
} from "@/lib/i18n/locale-routing";
import { tagPageHref } from "./content-hrefs";
import { CONTENT_ROOT, DOCS_ROOT } from "./content-paths";
import { collectTableMessageKeys } from "./module-comparison-table";
import { assetMessageKeys, loadPageAssets } from "./page-assets-load";
import {
  getMessageString,
  groupedQueryAttentionPageDir,
  hasPageMessagesFile,
  loadPageMessages,
  tokenGlossaryPageDir,
} from "./page-messages-load";
import {
  loadRegistry,
  type RegistryIndexes,
  RegistryLoadError,
  type RegistryRecord,
} from "./registry";
import {
  type ModuleRecord,
  type PageAssetConfig,
  type PageKind,
  type PageMessages,
  pageFrontmatterSchema,
} from "./schemas";
import { getTableById } from "./table-registry-runtime";
import { loadTagMessages, TagMessagesLoadError } from "./tag-messages";
import { parseYamlFrontmatterBlock } from "./yaml-frontmatter";

export { parseYamlFrontmatterBlock };

export type ValidationError = {
  code: string;
  message: string;
  path?: string;
};

const defaultContentRoot = CONTENT_ROOT;
const defaultDocsRoot = DOCS_ROOT;

const registryKindDirectories: Record<string, string> = {
  module: "modules",
  concept: "concepts",
  model: "models",
  paper: "papers",
  "training-regime": "training-regimes",
  tag: "tags",
  citation: "citations",
  graph: "graphs",
};

/** Glossary pages reference concept registry records with a distinct page kind. */
const pageKindRegistryKindAliases: Partial<
  Record<PageKind, RegistryRecord["kind"]>
> = {
  glossary: "concept",
};

/** Docs sections whose `page.mdx` slugs must match a concept registry record slug. */
const conceptBackedDocsSections = new Set(["glossary", "concepts"]);

function pageKindMatchesRegistryRecord(
  pageKind: PageKind,
  registryKind: RegistryRecord["kind"],
): boolean {
  return (
    pageKind === registryKind ||
    pageKindRegistryKindAliases[pageKind] === registryKind
  );
}

function pageDirectorySlugFromPath(pagePath: string): string | undefined {
  const normalized = pagePath.replace(/\\/g, "/");
  const match = normalized.match(/\/(glossary|concepts)\/([^/]+)\/page\.mdx$/);
  return match?.[2];
}

function conceptBackedDocsSectionFromPath(
  pagePath: string,
): string | undefined {
  const normalized = pagePath.replace(/\\/g, "/");
  const match = normalized.match(/\/(glossary|concepts)\/([^/]+)\/page\.mdx$/);
  return match?.[1];
}

function isPublishedSourceRecord(record: RegistryRecord): boolean {
  return record.status === "published";
}

/** Phase 1 page directories validated even when `page.mdx` is not present yet. */
export const phase1PageDirectories = [
  groupedQueryAttentionPageDir,
  tokenGlossaryPageDir,
] as const;

export type ValidateRegistryContentOptions = {
  registryRoot?: string;
  docsRoot?: string;
  /** Override Phase 1 page directories (for tests). */
  phase1PageDirectories?: readonly string[];
};

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((error) => error.message).join("\n");
}

function errorsFromRegistryLoadError(
  error: RegistryLoadError,
): ValidationError[] {
  return error.details.map((detail) => {
    switch (detail.type) {
      case "duplicate-id":
        return {
          code: "duplicate-id",
          message: `Duplicate registry id "${detail.id}" in: ${detail.paths.join(", ")}`,
        };
      case "duplicate-slug":
        return {
          code: "duplicate-slug",
          message: `Duplicate registry slug "${detail.slug}" in: ${detail.paths.join(", ")}`,
        };
      case "parse-error":
        return {
          code: "parse-error",
          message: `Registry parse error at ${detail.path}: ${detail.message}`,
          path: detail.path,
        };
      default: {
        const unexpected: never = detail;
        return {
          code: "parse-error",
          message: `Registry load error: ${JSON.stringify(unexpected)}`,
        };
      }
    }
  });
}

function resolveTagRecord(
  tagRef: string,
  indexes: RegistryIndexes,
): RegistryRecord | undefined {
  const bySlug = indexes.bySlug.get(tagRef);
  if (bySlug?.kind === "tag") {
    return bySlug;
  }
  const tagId = tagRef.startsWith("tag.") ? tagRef : `tag.${tagRef}`;
  const byId = indexes.byId.get(tagId);
  if (byId?.kind === "tag") {
    return byId;
  }
  return undefined;
}

function moduleReferenceFields(
  record: ModuleRecord,
): Array<{ field: string; ids: string[] }> {
  return [
    { field: "relatedIds", ids: record.relatedIds },
    { field: "citationIds", ids: record.citationIds },
    { field: "exampleModelIds", ids: record.exampleModelIds },
    { field: "improvesOnIds", ids: record.improvesOnIds },
    { field: "tradeoffIds", ids: record.tradeoffIds },
    { field: "usedByModelIds", ids: record.usedByModelIds },
    { field: "introducedByPaperIds", ids: record.introducedByPaperIds },
  ];
}

function validateRegistryRecordReferences(
  record: RegistryRecord,
  indexes: RegistryIndexes,
  filePath: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const referenceFields: Array<{ field: string; ids: string[] }> = [
    { field: "relatedIds", ids: record.relatedIds },
    { field: "citationIds", ids: record.citationIds },
  ];

  if (record.kind === "module") {
    referenceFields.push(...moduleReferenceFields(record));
  }

  if (record.kind === "concept") {
    referenceFields.push(
      { field: "prerequisiteIds", ids: record.prerequisiteIds },
      { field: "explainsIds", ids: record.explainsIds },
    );
  }

  if (record.kind === "model") {
    referenceFields.push(
      { field: "architectureIds", ids: record.architectureIds },
      { field: "moduleIds", ids: record.moduleIds },
      { field: "trainingRegimeIds", ids: record.trainingRegimeIds },
      { field: "datasetIds", ids: record.datasetIds },
      { field: "paperIds", ids: record.paperIds },
    );
  }

  if (record.kind === "paper") {
    referenceFields.push(
      { field: "introducesIds", ids: record.introducesIds },
      { field: "supportsIds", ids: record.supportsIds },
      { field: "arguesAgainstIds", ids: record.arguesAgainstIds },
      { field: "modelIds", ids: record.modelIds },
      { field: "moduleIds", ids: record.moduleIds },
      { field: "conceptIds", ids: record.conceptIds },
    );
  }

  if (record.kind === "training-regime") {
    referenceFields.push(
      { field: "usedByModelIds", ids: record.usedByModelIds },
      { field: "relatedModuleIds", ids: record.relatedModuleIds },
      { field: "paperIds", ids: record.paperIds },
    );
  }

  if (
    record.kind === "graph" &&
    isPublishedSourceRecord(record) &&
    !indexes.byId.has(record.subjectId)
  ) {
    errors.push({
      code: "unresolved-reference",
      message: `${record.id}: subjectId references missing record "${record.subjectId}"`,
      path: filePath,
    });
  }

  if (isPublishedSourceRecord(record)) {
    for (const { field, ids } of referenceFields) {
      for (const id of ids) {
        if (!indexes.byId.has(id)) {
          errors.push({
            code: "unresolved-reference",
            message: `${record.id}: ${field} references missing record "${id}"`,
            path: filePath,
          });
        }
      }
    }
  }

  for (const tagRef of record.tags) {
    if (!resolveTagRecord(tagRef, indexes)) {
      errors.push({
        code: "unresolved-tag",
        message: `${record.id}: tags references unknown tag "${tagRef}"`,
        path: filePath,
      });
    }
  }

  const expectedDirectory = registryKindDirectories[record.kind];
  if (expectedDirectory) {
    const expectedSuffix = join(
      "registry",
      expectedDirectory,
      `${record.slug}.json`,
    );
    if (!filePath.replace(/\\/g, "/").endsWith(expectedSuffix)) {
      errors.push({
        code: "path-kind-mismatch",
        message: `${record.id}: expected file path to end with ${expectedSuffix}, got ${filePath}`,
        path: filePath,
      });
    }
  }

  return errors;
}

function extractQuotedAttributeValues(
  content: string,
  attributeName: string,
): string[] {
  const pattern = new RegExp(`\\b${attributeName}="([^"]+)"`, "g");
  const values: string[] = [];
  for (const match of content.matchAll(pattern)) {
    if (match[1]) {
      values.push(match[1]);
    }
  }
  return values;
}

function extractMdxMessageKeys(mdxBody: string): string[] {
  const keys = new Set<string>();
  for (const key of extractQuotedAttributeValues(mdxBody, "k")) {
    keys.add(key);
  }
  for (const key of extractQuotedAttributeValues(mdxBody, "titleKey")) {
    keys.add(key);
  }
  return [...keys];
}

function extractMdxAssetIds(mdxBody: string): string[] {
  return extractQuotedAttributeValues(mdxBody, "assetId");
}

function validateAssetMessageKeys(
  pageDirectory: string,
  assets: PageAssetConfig,
  messages: PageMessages,
  locale: SiteLocale = defaultLocale,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [assetId, asset] of Object.entries(assets)) {
    const keys = assetMessageKeys(asset);
    for (const key of keys) {
      if (!getMessageString(messages, key)) {
        errors.push({
          code: "missing-message-key",
          message: `${pageDirectory}: locale "${locale}" asset "${assetId}" references missing message key "${key}"`,
          path: join(pageDirectory, "assets.json"),
        });
      }
    }
  }

  return errors;
}

function validateGraphAssetReferences(
  pageDirectory: string,
  assets: PageAssetConfig,
  indexes: RegistryIndexes,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [assetId, asset] of Object.entries(assets)) {
    if (asset.type !== "graph") {
      continue;
    }
    if (!indexes.byId.has(asset.graphId)) {
      errors.push({
        code: "unresolved-graph-id",
        message: `${pageDirectory}: asset "${assetId}" references missing graph "${asset.graphId}"`,
        path: join(pageDirectory, "assets.json"),
      });
    }
  }

  return errors;
}

function validateTableAssetReferences(
  pageDirectory: string,
  assets: PageAssetConfig,
  messages: PageMessages,
  indexes: RegistryIndexes,
  locale: SiteLocale = defaultLocale,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [assetId, asset] of Object.entries(assets)) {
    if (asset.type !== "table") {
      continue;
    }

    const tableRecord = getTableById(asset.tableId);
    if (!tableRecord) {
      errors.push({
        code: "unresolved-table-id",
        message: `${pageDirectory}: asset "${assetId}" references missing table "${asset.tableId}"`,
        path: join(pageDirectory, "assets.json"),
      });
      continue;
    }

    for (const column of tableRecord.columns) {
      if (!indexes.byId.has(column.moduleId)) {
        errors.push({
          code: "unresolved-table-module-id",
          message: `${pageDirectory}: table "${asset.tableId}" references missing module "${column.moduleId}"`,
          path: join(pageDirectory, "assets.json"),
        });
      }
    }

    for (const key of collectTableMessageKeys(tableRecord)) {
      if (!getMessageString(messages, key)) {
        errors.push({
          code: "missing-table-message-key",
          message: `${pageDirectory}: locale "${locale}" table "${asset.tableId}" references missing message key "${key}"`,
          path: join(pageDirectory, "messages", `${locale}.json`),
        });
      }
    }
  }

  return errors;
}

async function discoverPageMdxFiles(docsRoot: string): Promise<string[]> {
  const pagePaths: string[] = [];

  async function walk(directory: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(directory);
    } catch {
      return;
    }

    for (const entry of entries.sort()) {
      const fullPath = join(directory, entry);
      if (entry === "page.mdx") {
        pagePaths.push(fullPath);
        continue;
      }
      if (!entry.includes(".")) {
        await walk(fullPath);
      }
    }
  }

  await walk(docsRoot);
  return pagePaths;
}

export async function validateColocatedPageBundle(
  pageDirectory: string,
  indexes?: RegistryIndexes,
): Promise<{
  errors: ValidationError[];
  messages?: PageMessages;
  assets?: PageAssetConfig;
}> {
  const errors: ValidationError[] = [];

  let messages: PageMessages;
  try {
    messages = await loadPageMessages(pageDirectory, "en");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      code: "messages-load-error",
      message: `${pageDirectory}: ${message}`,
      path: join(pageDirectory, "messages", "en.json"),
    });
    return { errors };
  }

  let assets: PageAssetConfig;
  try {
    assets = await loadPageAssets(pageDirectory);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      code: "assets-load-error",
      message: `${pageDirectory}: ${message}`,
      path: join(pageDirectory, "assets.json"),
    });
    return { errors, messages };
  }

  errors.push(...validateAssetMessageKeys(pageDirectory, assets, messages));

  if (indexes) {
    errors.push(
      ...validateGraphAssetReferences(pageDirectory, assets, indexes),
      ...validateTableAssetReferences(pageDirectory, assets, messages, indexes),
    );
  }

  return { errors, messages, assets };
}

function docsUrlForPageDirectory(
  docsRoot: string,
  pageDirectory: string,
  locale: SiteLocale,
): string {
  const docsSlug = pageDirectory
    .replace(`${docsRoot}/`, "")
    .replace(/\\/g, "/");
  return buildLocalizedRoute({ surface: "docs-page", slug: docsSlug }, locale);
}

async function validateLocalizedPageMessages(
  pagePath: string,
  pageDirectory: string,
  docsRoot: string,
  mdxBody: string,
  assets: PageAssetConfig,
  indexes: RegistryIndexes,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  for (const locale of supportedLocales) {
    if (
      locale === defaultLocale ||
      !hasPageMessagesFile(pageDirectory, locale)
    ) {
      continue;
    }

    const route = docsUrlForPageDirectory(docsRoot, pageDirectory, locale);

    let messages: PageMessages;
    try {
      messages = await loadPageMessages(pageDirectory, locale, { route });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        code: "messages-load-error",
        message: `${pageDirectory}: ${message}`,
        path: join(pageDirectory, "messages", `${locale}.json`),
      });
      continue;
    }

    errors.push(
      ...validateAssetMessageKeys(pageDirectory, assets, messages, locale),
      ...validateTableAssetReferences(
        pageDirectory,
        assets,
        messages,
        indexes,
        locale,
      ),
    );

    for (const messageKey of extractMdxMessageKeys(mdxBody)) {
      if (!getMessageString(messages, messageKey)) {
        errors.push({
          code: "missing-message-key",
          message: `${pagePath}: locale "${locale}" MDX references missing message key "${messageKey}"`,
          path: join(pageDirectory, "messages", `${locale}.json`),
        });
      }
    }
  }

  return errors;
}

async function validatePageMdx(
  pagePath: string,
  docsRoot: string,
  indexes: RegistryIndexes,
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const pageDirectory = join(pagePath, "..");
  const raw = await readFile(pagePath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match?.[1]) {
    errors.push({
      code: "missing-frontmatter",
      message: `${pagePath}: missing YAML frontmatter block`,
      path: pagePath,
    });
    return errors;
  }

  const frontmatterRaw = parseYamlFrontmatterBlock(match[1]);
  const frontmatter = pageFrontmatterSchema.safeParse(frontmatterRaw);
  if (!frontmatter.success) {
    const message = frontmatter.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    errors.push({
      code: "invalid-frontmatter",
      message: `${pagePath}: invalid frontmatter — ${message}`,
      path: pagePath,
    });
    return errors;
  }

  const registryRecord = indexes.byId.get(frontmatter.data.registryId);
  if (!registryRecord) {
    errors.push({
      code: "unresolved-registry-id",
      message: `${pagePath}: registryId "${frontmatter.data.registryId}" does not resolve`,
      path: pagePath,
    });
  } else {
    if (
      !pageKindMatchesRegistryRecord(frontmatter.data.kind, registryRecord.kind)
    ) {
      errors.push({
        code: "kind-mismatch",
        message: `${pagePath}: frontmatter kind "${frontmatter.data.kind}" does not match registry record kind "${registryRecord.kind}"`,
        path: pagePath,
      });
    }

    const docsSection = conceptBackedDocsSectionFromPath(pagePath);
    if (
      registryRecord.kind === "concept" &&
      docsSection &&
      conceptBackedDocsSections.has(docsSection)
    ) {
      const pageSlug = pageDirectorySlugFromPath(pagePath);
      if (pageSlug && pageSlug !== registryRecord.slug) {
        errors.push({
          code: "page-slug-mismatch",
          message: `${pagePath}: page directory slug "${pageSlug}" does not match registry slug "${registryRecord.slug}" for ${registryRecord.id}`,
          path: pagePath,
        });
      }
    }
  }

  for (const tagRef of frontmatter.data.tags) {
    if (!resolveTagRecord(tagRef, indexes)) {
      errors.push({
        code: "unresolved-tag",
        message: `${pagePath}: frontmatter tag "${tagRef}" does not resolve to a tag record`,
        path: pagePath,
      });
    }
  }

  const bundle = await validateColocatedPageBundle(pageDirectory, indexes);
  errors.push(...bundle.errors);
  if (!bundle.messages || !bundle.assets) {
    return errors;
  }
  const { messages, assets } = bundle;

  const mdxBody = match[2] ?? "";
  for (const messageKey of extractMdxMessageKeys(mdxBody)) {
    if (!getMessageString(messages, messageKey)) {
      errors.push({
        code: "missing-message-key",
        message: `${pagePath}: MDX references missing message key "${messageKey}"`,
        path: pagePath,
      });
    }
  }

  for (const assetId of extractMdxAssetIds(mdxBody)) {
    if (!assets[assetId]) {
      errors.push({
        code: "unknown-asset-id",
        message: `${pagePath}: MDX references unknown asset id "${assetId}"`,
        path: pagePath,
      });
    }
  }

  errors.push(
    ...(await validateLocalizedPageMessages(
      pagePath,
      pageDirectory,
      docsRoot,
      mdxBody,
      assets,
      indexes,
    )),
  );

  return errors;
}

function isPublishedTagRecord(record: RegistryRecord): boolean {
  return record.kind === "tag" && record.status === "published";
}

function validationErrorsFromTagMessagesLoadError(
  error: TagMessagesLoadError,
): ValidationError[] {
  return error.details.map((detail) => ({
    code:
      detail.type === "missing-file"
        ? "tag-messages-load-error"
        : "tag-messages-parse-error",
    message: error.message,
    path: detail.path,
  }));
}

function validateLocalizedTagMessages(
  indexes: RegistryIndexes,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const record of indexes.byId.values()) {
    if (!isPublishedTagRecord(record)) {
      continue;
    }

    for (const locale of supportedLocales) {
      try {
        loadTagMessages(record.slug, locale, {
          route: tagPageHref(record.slug, locale),
        });
      } catch (error) {
        if (error instanceof TagMessagesLoadError) {
          errors.push(...validationErrorsFromTagMessagesLoadError(error));
          continue;
        }

        throw error;
      }
    }
  }

  return errors;
}

async function validateRegistryFiles(
  options: ValidateRegistryContentOptions,
): Promise<{ indexes: RegistryIndexes; errors: ValidationError[] }> {
  try {
    const indexes = await loadRegistry({
      registryRoot: options.registryRoot,
    });
    const errors: ValidationError[] = [];
    const registryRoot =
      options.registryRoot ?? join(defaultContentRoot, "registry");

    for (const directory of Object.values(registryKindDirectories)) {
      const directoryPath = join(registryRoot, directory);
      let entries: string[];
      try {
        entries = await readdir(directoryPath);
      } catch {
        continue;
      }

      for (const fileName of entries.filter((entry) =>
        entry.endsWith(".json"),
      )) {
        const filePath = join(directoryPath, fileName);
        const raw = await readFile(filePath, "utf8");
        const json = JSON.parse(raw) as RegistryRecord;
        const record = indexes.byId.get(json.id);
        if (record) {
          errors.push(
            ...validateRegistryRecordReferences(record, indexes, filePath),
          );
        }
      }
    }

    return { indexes, errors };
  } catch (error) {
    if (error instanceof RegistryLoadError) {
      return {
        indexes: {
          byId: new Map(),
          bySlug: new Map(),
          tagsById: new Map(),
          tagsBySlug: new Map(),
        },
        errors: errorsFromRegistryLoadError(error),
      };
    }
    throw error;
  }
}

export async function validateRegistryContent(
  options: ValidateRegistryContentOptions = {},
): Promise<ValidationError[]> {
  const docsRoot = options.docsRoot ?? defaultDocsRoot;
  const { indexes, errors: registryErrors } =
    await validateRegistryFiles(options);

  if (registryErrors.some((error) => error.code === "parse-error")) {
    return registryErrors;
  }

  const errors = [...registryErrors];

  const pagePaths = await discoverPageMdxFiles(docsRoot);
  const validatedPageDirectories = new Set<string>();

  for (const pagePath of pagePaths) {
    validatedPageDirectories.add(join(pagePath, ".."));
    errors.push(...(await validatePageMdx(pagePath, docsRoot, indexes)));
  }

  const phase1Dirs = options.phase1PageDirectories ?? phase1PageDirectories;

  for (const pageDirectory of phase1Dirs) {
    if (validatedPageDirectories.has(pageDirectory)) {
      continue;
    }
    errors.push(
      ...(await validateColocatedPageBundle(pageDirectory, indexes)).errors,
    );
  }

  errors.push(...validateLocalizedTagMessages(indexes));

  return errors;
}
