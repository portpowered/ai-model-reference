import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadPageAssets } from "./assets";
import { loadPageMessages } from "./messages";
import {
  type RegistryIndexes,
  RegistryLoadError,
  type RegistryRecord,
  loadRegistry,
} from "./registry";
import {
  type ModuleRecord,
  type PageAsset,
  type PageAssetConfig,
  type PageMessages,
  pageFrontmatterSchema,
} from "./schemas";

export type ValidationError = {
  code: string;
  message: string;
  path?: string;
};

const defaultContentRoot = join(import.meta.dir, "../../content");
const defaultDocsRoot = join(defaultContentRoot, "docs");

const registryKindDirectories: Record<string, string> = {
  module: "modules",
  tag: "tags",
  citation: "citations",
};

export type ValidateRegistryContentOptions = {
  registryRoot?: string;
  docsRoot?: string;
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

export function parseYamlFrontmatterBlock(
  block: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = block.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!keyMatch) {
      i += 1;
      continue;
    }
    const [, key, rest] = keyMatch;
    if (rest.length === 0) {
      const items: string[] = [];
      i += 1;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s+-\s+/, "").replace(/^"|"$/g, ""));
        i += 1;
      }
      result[key] = items;
      continue;
    }
    result[key] = rest.replace(/^"|"$/g, "");
    i += 1;
  }
  return result;
}

function hasMessageKey(messages: PageMessages, keyPath: string): boolean {
  const parts = keyPath.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (current === null || typeof current !== "object") {
      return false;
    }
    if (!(part in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string";
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
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [assetId, asset] of Object.entries(assets)) {
    const keys = assetMessageKeys(asset);
    for (const key of keys) {
      if (!hasMessageKey(messages, key)) {
        errors.push({
          code: "missing-message-key",
          message: `${pageDirectory}: asset "${assetId}" references missing message key "${key}"`,
          path: join(pageDirectory, "assets.json"),
        });
      }
    }
  }

  return errors;
}

function assetMessageKeys(asset: PageAsset): string[] {
  const keys: string[] = [];
  if ("altKey" in asset && asset.altKey) {
    keys.push(asset.altKey);
  }
  if ("captionKey" in asset && asset.captionKey) {
    keys.push(asset.captionKey);
  }
  return keys;
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

async function validatePageMdx(
  pagePath: string,
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
  } else if (registryRecord.kind !== frontmatter.data.kind) {
    errors.push({
      code: "kind-mismatch",
      message: `${pagePath}: frontmatter kind "${frontmatter.data.kind}" does not match registry record kind "${registryRecord.kind}"`,
      path: pagePath,
    });
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
    return errors;
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
    return errors;
  }

  errors.push(...validateAssetMessageKeys(pageDirectory, assets, messages));

  const mdxBody = match[2] ?? "";
  for (const messageKey of extractMdxMessageKeys(mdxBody)) {
    if (!hasMessageKey(messages, messageKey)) {
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
  for (const pagePath of pagePaths) {
    errors.push(...(await validatePageMdx(pagePath, indexes)));
  }

  return errors;
}
