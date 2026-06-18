import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DOCS_ROOT } from "@/lib/content/content-paths";
import { loadPageMessages } from "@/lib/content/page-messages-load";
import {
  type PageFrontmatter,
  type PageMessages,
  pageFrontmatterSchema,
  pageMessagesSchema,
} from "@/lib/content/schemas";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";
import { parseYamlFrontmatterBlock } from "@/lib/content/yaml-frontmatter";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";

export type DocsPageSource = {
  pageDir: string;
  docsSlug: string;
  url: string;
  frontmatter: PageFrontmatter;
  messages: PageMessages;
};

function parseFrontmatter(pageMdxPath: string): PageFrontmatter {
  const source = readFileSync(pageMdxPath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    throw new Error(`Missing frontmatter in ${pageMdxPath}`);
  }

  return pageFrontmatterSchema.parse(parseYamlFrontmatterBlock(match[1]));
}

function findPageDirectories(
  rootDir: string,
  relativeParts: string[] = [],
): string[] {
  const directories: string[] = [];
  if (!existsSync(rootDir)) {
    return directories;
  }
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const pageDir = path.join(rootDir, entry.name);
    const nextParts = [...relativeParts, entry.name];
    const pageMdx = path.join(pageDir, "page.mdx");
    if (existsSync(pageMdx)) {
      directories.push(pageDir);
      continue;
    }
    directories.push(...findPageDirectories(pageDir, nextParts));
  }
  return directories;
}

export function docsUrlFromSlug(docsSlug: string, locale: SiteLocale): string {
  return buildLocalizedRoute({ surface: "docs-page", slug: docsSlug }, locale);
}

function hasPageMessagesFile(pageDir: string, locale: SiteLocale): boolean {
  return existsSync(path.join(pageDir, "messages", `${locale}.json`));
}

function loadPageMessagesSync(
  pageDirectory: string,
  locale: SiteLocale,
): PageMessages {
  const messagesPath = path.join(pageDirectory, "messages", `${locale}.json`);
  const raw = readFileSync(messagesPath, "utf8");
  return pageMessagesSchema.parse(JSON.parse(raw));
}

export function isDocsPageShippedForLocale(
  docsSlug: string,
  locale: SiteLocale,
  rootDir = DOCS_ROOT,
): boolean {
  if (locale === defaultLocale) {
    return true;
  }

  return (
    isShippedLocalizedDocsSlug(docsSlug, locale) &&
    hasPageMessagesFile(path.join(rootDir, docsSlug), locale)
  );
}

export async function loadPublishedDocsPages(
  locale: SiteLocale,
  rootDir = DOCS_ROOT,
): Promise<DocsPageSource[]> {
  const pages: DocsPageSource[] = [];

  for (const pageDir of findPageDirectories(rootDir)) {
    const pageMdx = path.join(pageDir, "page.mdx");
    const frontmatter = parseFrontmatter(pageMdx);
    if (frontmatter.status !== "published") {
      continue;
    }

    const docsSlug = path.relative(rootDir, pageDir);
    const url = docsUrlFromSlug(docsSlug, locale);
    pages.push({
      pageDir,
      docsSlug,
      url,
      frontmatter,
      messages: await loadPageMessages(pageDir, locale, { route: url }),
    });
  }

  return pages;
}

export function loadPublishedDocsPagesSync(
  locale: SiteLocale,
  rootDir = DOCS_ROOT,
): DocsPageSource[] {
  const pages: DocsPageSource[] = [];

  for (const pageDir of findPageDirectories(rootDir)) {
    const pageMdx = path.join(pageDir, "page.mdx");
    const frontmatter = parseFrontmatter(pageMdx);
    if (frontmatter.status !== "published") {
      continue;
    }

    const docsSlug = path.relative(rootDir, pageDir);
    const url = docsUrlFromSlug(docsSlug, locale);
    pages.push({
      pageDir,
      docsSlug,
      url,
      frontmatter,
      messages: loadPageMessagesSync(pageDir, locale),
    });
  }

  return pages;
}

/**
 * Loads the docs pages that are actually shippable for the requested locale.
 * Non-default locales only include pages declared in the shipped-docs manifest.
 */
export async function loadShippedLocalizedDocsPages(
  locale: SiteLocale,
  rootDir = DOCS_ROOT,
): Promise<DocsPageSource[]> {
  if (locale === defaultLocale) {
    return loadPublishedDocsPages(locale, rootDir);
  }

  const pages: DocsPageSource[] = [];

  for (const pageDir of findPageDirectories(rootDir)) {
    const pageMdx = path.join(pageDir, "page.mdx");
    const frontmatter = parseFrontmatter(pageMdx);
    if (frontmatter.status !== "published") {
      continue;
    }

    if (!isDocsPageShippedForLocale(path.relative(rootDir, pageDir), locale)) {
      continue;
    }

    const docsSlug = path.relative(rootDir, pageDir);
    const url = docsUrlFromSlug(docsSlug, locale);
    pages.push({
      pageDir,
      docsSlug,
      url,
      frontmatter,
      messages: await loadPageMessages(pageDir, locale, { route: url }),
    });
  }

  return pages;
}
