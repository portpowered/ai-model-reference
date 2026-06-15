import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TOCItemType } from "fumadocs-core/toc";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { PAPERS_DOCS_ROOT } from "@/lib/content/content-paths";
import { moduleMdxCompileOptions } from "@/lib/content/mdx-compile-options";
import { moduleMdxComponents } from "@/lib/content/mdx-components";
import {
  type PageAssetConfig,
  type PageFrontmatter,
  type PageMessages,
  pageFrontmatterSchema,
  pageMessagesSchema,
} from "@/lib/content/schemas";
import { buildLocalDocsTableOfContents } from "@/lib/navigation/local-docs-toc";

export type LoadedPaperPage = {
  frontmatter: PageFrontmatter;
  messages: PageMessages;
  assets: PageAssetConfig;
  content: ReactElement;
  toc: TOCItemType[];
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export async function loadPaperPageFromDisk(
  slug: string,
  locale = "en",
  papersDocsRoot = PAPERS_DOCS_ROOT,
): Promise<LoadedPaperPage> {
  const pageDir = join(papersDocsRoot, slug);
  const mdxPath = join(pageDir, "page.mdx");
  const messagesPath = join(pageDir, "messages", `${locale}.json`);
  const assetsPath = join(pageDir, "assets.json");

  const source = readFileSync(mdxPath, "utf8");
  const messages = pageMessagesSchema.parse(readJsonFile(messagesPath));
  const assets = parsePageAssetConfig(readJsonFile(assetsPath));

  const { content, frontmatter } = await compileMDX<PageFrontmatter>({
    source,
    components: moduleMdxComponents,
    options: moduleMdxCompileOptions,
  });

  const parsedFrontmatter = pageFrontmatterSchema.parse(frontmatter);

  return {
    frontmatter: parsedFrontmatter,
    messages,
    assets,
    content,
    toc: buildLocalDocsTableOfContents(source, messages),
  };
}
