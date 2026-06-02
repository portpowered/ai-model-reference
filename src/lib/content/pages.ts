import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { loadPageMessages } from "./messages";
import {
  type PageFrontmatter,
  type PageMessages,
  pageFrontmatterSchema,
} from "./schemas";

const DOCS_ROOT = path.join(process.cwd(), "src/content/docs");

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
  if (!match) {
    throw new Error(`Missing frontmatter in ${pageMdxPath}`);
  }

  const frontmatter: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (rawValue.startsWith("-")) {
      continue;
    }
    if (rawValue === "") {
      continue;
    }
    frontmatter[key] = rawValue.replace(/^"|"$/g, "");
  }

  const listKey = (key: string): string[] => {
    const values: string[] = [];
    let inBlock = false;
    for (const line of match[1].split("\n")) {
      if (line.trim() === `${key}:`) {
        inBlock = true;
        continue;
      }
      if (inBlock) {
        const item = line.match(/^\s+-\s+(.+)$/);
        if (item) {
          values.push(item[1].replace(/^"|"$/g, ""));
          continue;
        }
        if (line.trim() && !line.startsWith(" ")) {
          break;
        }
      }
    }
    return values;
  };

  frontmatter.tags = listKey("tags");
  frontmatter.aliases = listKey("aliases");

  return pageFrontmatterSchema.parse(frontmatter);
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

export function docsUrlFromSlug(docsSlug: string): string {
  return `/docs/${docsSlug}`;
}

export function loadPublishedDocsPages(
  locale: string,
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
    pages.push({
      pageDir,
      docsSlug,
      url: docsUrlFromSlug(docsSlug),
      frontmatter,
      messages: loadPageMessages(pageDir, locale),
    });
  }

  return pages;
}
