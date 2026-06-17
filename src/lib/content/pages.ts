import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DOCS_ROOT } from "@/lib/content/content-paths";
import { loadPageMessages } from "@/lib/content/page-messages-load";
import {
  type PageFrontmatter,
  type PageMessages,
  pageFrontmatterSchema,
} from "@/lib/content/schemas";
import { parseYamlFrontmatterBlock } from "@/lib/content/yaml-frontmatter";
import {
  buildLocalizedRoute,
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
