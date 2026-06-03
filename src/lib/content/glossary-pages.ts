import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { glossaryPageHref } from "@/lib/content/content-hrefs";
import {
  type PageFrontmatter,
  pageFrontmatterSchema,
  pageMessagesSchema,
} from "@/lib/content/schemas";
import { parseYamlFrontmatterBlock } from "@/lib/content/yaml-frontmatter";

export { glossaryPageHref } from "@/lib/content/content-hrefs";

export type GlossaryPageListing = {
  slug: string;
  title: string;
  summary: string;
  url: string;
};

export type ListPublishedGlossaryPagesOptions = {
  contentRoot?: string;
  locale?: string;
};

function getDefaultContentRoot(): string {
  return join(process.cwd(), "src/content/docs/glossary");
}

function isEnoent(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

async function readGlossaryFrontmatter(
  mdxPath: string,
): Promise<PageFrontmatter | null> {
  let raw: string;
  try {
    raw = await readFile(mdxPath, "utf8");
  } catch (error) {
    if (isEnoent(error)) {
      return null;
    }
    throw error;
  }

  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    return null;
  }

  const parsed = pageFrontmatterSchema.safeParse(
    parseYamlFrontmatterBlock(match[1]),
  );
  if (!parsed.success || parsed.data.kind !== "glossary") {
    return null;
  }

  return parsed.data;
}

async function readGlossaryMessages(pageDir: string, locale: string) {
  const messagesPath = join(pageDir, "messages", `${locale}.json`);
  const raw = await readFile(messagesPath, "utf8");
  return pageMessagesSchema.parse(JSON.parse(raw));
}

export async function listPublishedGlossaryPages(
  options: ListPublishedGlossaryPagesOptions = {},
): Promise<GlossaryPageListing[]> {
  const contentRoot = options.contentRoot ?? getDefaultContentRoot();
  const locale = options.locale ?? "en";

  let entries: string[];
  try {
    entries = await readdir(contentRoot);
  } catch (error) {
    if (isEnoent(error)) {
      return [];
    }
    throw error;
  }

  const listings: GlossaryPageListing[] = [];

  for (const entry of entries) {
    const pageDir = join(contentRoot, entry);
    const pageDirStat = await stat(pageDir).catch(() => null);
    if (!pageDirStat?.isDirectory()) {
      continue;
    }

    const mdxPath = join(pageDir, "page.mdx");
    const frontmatter = await readGlossaryFrontmatter(mdxPath);
    if (frontmatter?.status !== "published") {
      continue;
    }

    const messages = await readGlossaryMessages(pageDir, locale);
    listings.push({
      slug: entry,
      title: messages.title,
      summary: messages.description,
      url: glossaryPageHref(entry),
    });
  }

  listings.sort((a, b) => a.title.localeCompare(b.title, locale));
  return listings;
}
