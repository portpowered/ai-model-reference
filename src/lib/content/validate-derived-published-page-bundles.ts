import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { CONTENT_ROOT, DOCS_ROOT } from "./content-paths";
import { hasPageMessagesFile } from "./page-messages-load";
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
  type PageKind,
  type PageMessages,
  pageFrontmatterSchema,
  pageMessagesSchema,
} from "./schemas";
import type { ValidationError } from "./validate-registry";
import { parseYamlFrontmatterBlock } from "./yaml-frontmatter";

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
): ValidationError[] {
  return [
    ...validatePublishedPageRouteMetadata(page, entry),
    ...validatePublishedPageRegistryAlignment(page, indexes),
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

    errors.push(...validateOrdinaryPublishedPageBundle(page, entry, indexes));
  }

  return errors;
}
