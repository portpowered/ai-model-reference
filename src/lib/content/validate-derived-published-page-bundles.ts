import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { CONTENT_ROOT, DOCS_ROOT } from "./content-paths";
import { assetMessageKeys } from "./page-assets-load";
import { getMessageString, hasPageMessagesFile } from "./page-messages-load";
import { type DocsPageSource, docsUrlFromSlug } from "./pages";
import { publishedDocsHrefFromEntry } from "./published-docs-registry-contract";
import {
  buildPublishedDocsIndex,
  type ScannedPublishedDocsEntry,
} from "./published-docs-registry-source";
import {
  loadRegistry,
  type RegistryIndexes,
  type RegistryRecord,
} from "./registry";
import {
  type PageAssetConfig,
  type PageKind,
  type PageMessages,
  pageAssetConfigSchema,
  pageFrontmatterSchema,
  pageMessagesSchema,
} from "./schemas";
import { validatePublishedGlossaryClassification } from "./validate-glossary-classification";
import type { ValidationError } from "./validate-registry";
import { parseYamlFrontmatterBlock } from "./yaml-frontmatter";

/**
 * Derived published-page bundle validation replaces routine per-page tests that
 * only re-check frontmatter, default-locale messages, registry alignment, tags,
 * declared citations, and local assets for ordinary published docs pages.
 *
 * Keep per-page tests for rendering contracts, search/discovery wiring, generated
 * graph/table asset runtime behavior, MDX template conformance, and focused
 * regression guards. `validateRegistryContent` still runs `validatePageMdx` for
 * those deeper checks; this module is the scanner-backed ordinary-page contract.
 */

/** Glossary pages reference concept registry records with a distinct page kind. */
const pageKindRegistryKindAliases: Partial<
  Record<PageKind, RegistryRecord["kind"]>
> = {
  glossary: "concept",
};

export type ValidateDerivedPublishedPageBundlesOptions = {
  docsRoot?: string;
  registryRoot?: string;
  locale?: SiteLocale;
  indexes?: RegistryIndexes;
};

function pageKindMatchesRegistryRecord(
  pageKind: PageKind,
  registryKind: RegistryRecord["kind"],
): boolean {
  return (
    pageKind === registryKind ||
    pageKindRegistryKindAliases[pageKind] === registryKind
  );
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

function resolveCitationReference(
  citationId: string,
  indexes: RegistryIndexes,
): RegistryRecord | undefined {
  const referenced = indexes.byId.get(citationId);
  if (referenced?.kind === "citation" || referenced?.kind === "paper") {
    return referenced;
  }
  return undefined;
}

function findPageDirectories(
  rootDir: string,
  relativeParts: string[] = [],
): string[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const directories: string[] = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const pageDir = join(rootDir, entry.name);
    const nextParts = [...relativeParts, entry.name];
    const pageMdx = join(pageDir, "page.mdx");
    if (existsSync(pageMdx)) {
      directories.push(pageDir);
      continue;
    }
    directories.push(...findPageDirectories(pageDir, nextParts));
  }
  return directories;
}

type ScanPublishedDocsPagesResult = {
  pages: DocsPageSource[];
  errors: ValidationError[];
};

export function scanPublishedDocsPagesForValidation(
  docsRoot: string,
  locale: SiteLocale = defaultLocale,
): ScanPublishedDocsPagesResult {
  const pages: DocsPageSource[] = [];
  const errors: ValidationError[] = [];

  for (const pageDir of findPageDirectories(docsRoot)) {
    const pagePath = join(pageDir, "page.mdx");
    const docsSlug = pageDir
      .slice(docsRoot.length + 1)
      .split(/[/\\]/)
      .join("/");
    const route = docsUrlFromSlug(docsSlug, locale);

    let raw: string;
    try {
      raw = readFileSync(pagePath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        code: "page-read-error",
        message: `${route}: cannot read page bundle at docs slug "${docsSlug}" — ${message}`,
        path: pagePath,
      });
      continue;
    }

    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match?.[1]) {
      errors.push({
        code: "missing-frontmatter",
        message: `${route}: missing YAML frontmatter block for docs slug "${docsSlug}"`,
        path: pagePath,
      });
      continue;
    }

    const frontmatterResult = pageFrontmatterSchema.safeParse(
      parseYamlFrontmatterBlock(match[1]),
    );
    if (!frontmatterResult.success) {
      const message = frontmatterResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      errors.push({
        code: "invalid-frontmatter",
        message: `${route}: invalid frontmatter for docs slug "${docsSlug}" — ${message}`,
        path: pagePath,
      });
      continue;
    }

    if (frontmatterResult.data.status !== "published") {
      continue;
    }

    const messagesPath = join(pageDir, "messages", `${locale}.json`);
    if (!hasPageMessagesFile(pageDir, locale)) {
      errors.push({
        code: "missing-default-locale-messages",
        message: `${route}: published page is missing default-locale messages for docs slug "${docsSlug}"`,
        path: messagesPath,
      });
      continue;
    }

    let messages: PageMessages;
    try {
      messages = pageMessagesSchema.parse(
        JSON.parse(readFileSync(messagesPath, "utf8")),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        code: "invalid-default-locale-messages",
        message: `${route}: default-locale messages are invalid for docs slug "${docsSlug}" — ${message}`,
        path: messagesPath,
      });
      continue;
    }

    if (!messages.title?.trim()) {
      errors.push({
        code: "missing-message-title",
        message: `${route}: default-locale messages must include a non-empty title for docs slug "${docsSlug}"`,
        path: messagesPath,
      });
    }

    if (!messages.description?.trim()) {
      errors.push({
        code: "missing-message-description",
        message: `${route}: default-locale messages must include a non-empty description for docs slug "${docsSlug}"`,
        path: messagesPath,
      });
    }

    pages.push({
      pageDir,
      docsSlug,
      url: route,
      frontmatter: frontmatterResult.data,
      messages,
    });
  }

  return { pages, errors };
}

export function validatePublishedPageRouteMetadata(
  page: DocsPageSource,
  entry: ScannedPublishedDocsEntry,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const pagePath = join(page.pageDir, "page.mdx");

  if (page.url !== entry.url) {
    errors.push({
      code: "route-metadata-url-mismatch",
      message: `${page.url}: discovered route does not match scanner entry url "${entry.url}" for docs slug "${page.docsSlug}"`,
      path: pagePath,
    });
  }

  const canonicalHref = publishedDocsHrefFromEntry(entry);
  if (page.url !== canonicalHref) {
    errors.push({
      code: "route-metadata-href-mismatch",
      message: `${page.url}: route does not match canonical published docs href "${canonicalHref}" for registryId "${entry.registryId}"`,
      path: pagePath,
    });
  }

  if (page.frontmatter.kind !== entry.pageKind) {
    errors.push({
      code: "route-metadata-kind-mismatch",
      message: `${page.url}: frontmatter kind "${page.frontmatter.kind}" does not match derived page kind "${entry.pageKind}" for docs slug "${page.docsSlug}"`,
      path: pagePath,
    });
  }

  if (page.docsSlug !== entry.docsSlug) {
    errors.push({
      code: "route-metadata-slug-mismatch",
      message: `${page.url}: docs slug "${page.docsSlug}" does not match scanner docs slug "${entry.docsSlug}"`,
      path: pagePath,
    });
  }

  if (page.frontmatter.registryId !== entry.registryId) {
    errors.push({
      code: "route-metadata-registry-id-mismatch",
      message: `${page.url}: frontmatter registryId "${page.frontmatter.registryId}" does not match scanner registryId "${entry.registryId}" for docs slug "${page.docsSlug}"`,
      path: pagePath,
    });
  }

  return errors;
}

export function validatePublishedPageDeclaredTags(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const pagePath = join(page.pageDir, "page.mdx");

  for (const tagRef of page.frontmatter.tags) {
    if (!resolveTagRecord(tagRef, indexes)) {
      errors.push({
        code: "unresolved-tag",
        message: `${page.url}: frontmatter tag "${tagRef}" does not resolve to a tag record for docs slug "${page.docsSlug}"`,
        path: pagePath,
      });
    }
  }

  return errors;
}

export function validatePublishedPageDeclaredCitations(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const pagePath = join(page.pageDir, "page.mdx");
  const registryRecord = indexes.byId.get(page.frontmatter.registryId);

  if (!registryRecord) {
    return errors;
  }

  for (const citationId of registryRecord.citationIds) {
    if (!resolveCitationReference(citationId, indexes)) {
      errors.push({
        code: "unresolved-citation",
        message: `${page.url}: declared citationId "${citationId}" does not resolve to a citation or paper record for docs slug "${page.docsSlug}"`,
        path: pagePath,
      });
    }
  }

  return errors;
}

export function validatePublishedPageDeclaredAssets(
  page: DocsPageSource,
  locale: SiteLocale = defaultLocale,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const pageDirectory = page.pageDir;
  const assetsPath = join(pageDirectory, "assets.json");

  if (page.frontmatter.assetNamespace !== "local") {
    return errors;
  }

  if (!existsSync(assetsPath)) {
    return errors;
  }

  let assets: PageAssetConfig;
  try {
    const raw = readFileSync(assetsPath, "utf8");
    const parsed = pageAssetConfigSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      errors.push({
        code: "invalid-assets-config",
        message: `${page.url}: declared local assets are invalid for docs slug "${page.docsSlug}" — ${message}`,
        path: assetsPath,
      });
      return errors;
    }
    assets = parsed.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      code: "assets-load-error",
      message: `${page.url}: declared local assets cannot be loaded for docs slug "${page.docsSlug}" — ${message}`,
      path: assetsPath,
    });
    return errors;
  }

  for (const [assetId, asset] of Object.entries(assets)) {
    for (const key of assetMessageKeys(asset)) {
      if (!getMessageString(page.messages, key)) {
        errors.push({
          code: "missing-asset-message-key",
          message: `${page.url}: locale "${locale}" asset "${assetId}" references missing message key "${key}" for docs slug "${page.docsSlug}"`,
          path: join(pageDirectory, "messages", `${locale}.json`),
        });
      }
    }
  }

  return errors;
}

export function validatePublishedPageRegistryAlignment(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const pagePath = join(page.pageDir, "page.mdx");
  const { registryId, kind } = page.frontmatter;

  const registryRecord = indexes.byId.get(registryId);
  if (!registryRecord) {
    errors.push({
      code: "unresolved-registry-id",
      message: `${page.url}: registryId "${registryId}" does not resolve to a registry record for docs slug "${page.docsSlug}"`,
      path: pagePath,
    });
    return errors;
  }

  if (!pageKindMatchesRegistryRecord(kind, registryRecord.kind)) {
    errors.push({
      code: "kind-mismatch",
      message: `${page.url}: page kind "${kind}" does not align with registry record kind "${registryRecord.kind}" for registryId "${registryId}"`,
      path: pagePath,
    });
  }

  return errors;
}

export function validateOrdinaryPublishedPageBundle(
  page: DocsPageSource,
  entry: ScannedPublishedDocsEntry,
  indexes: RegistryIndexes,
  locale: SiteLocale = defaultLocale,
): ValidationError[] {
  return [
    ...validatePublishedPageRouteMetadata(page, entry),
    ...validatePublishedPageRegistryAlignment(page, indexes),
    ...validatePublishedPageDeclaredTags(page, indexes),
    ...validatePublishedPageDeclaredCitations(page, indexes),
    ...validatePublishedPageDeclaredAssets(page, locale),
  ];
}

export async function validateDerivedPublishedPageBundles(
  options: ValidateDerivedPublishedPageBundlesOptions = {},
): Promise<ValidationError[]> {
  const docsRoot = options.docsRoot ?? DOCS_ROOT;
  const locale = options.locale ?? defaultLocale;
  const registryRoot = options.registryRoot ?? join(CONTENT_ROOT, "registry");

  const { pages, errors } = scanPublishedDocsPagesForValidation(
    docsRoot,
    locale,
  );

  let indexes = options.indexes;
  if (!indexes) {
    indexes = await loadRegistry({ registryRoot });
  }

  const index = buildPublishedDocsIndex(pages);

  for (const page of pages) {
    const entry = index.entries.find(
      (candidate) => candidate.docsSlug === page.docsSlug,
    );
    if (!entry) {
      errors.push({
        code: "missing-scanner-entry",
        message: `${page.url}: published page at docs slug "${page.docsSlug}" is missing from scanner-backed published docs index`,
        path: join(page.pageDir, "page.mdx"),
      });
      continue;
    }

    errors.push(
      ...validateOrdinaryPublishedPageBundle(page, entry, indexes, locale),
    );
    errors.push(...validatePublishedGlossaryClassification(page, indexes));
  }

  return errors;
}
