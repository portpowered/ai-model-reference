import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { CONCEPTS_DOCS_ROOT } from "@/lib/content/content-paths";
import { moduleMdxCompileOptions } from "@/lib/content/mdx-compile-options";
import { moduleMdxComponents } from "@/lib/content/mdx-components";
import {
  type PageAssetConfig,
  type PageFrontmatter,
  type PageMessages,
  pageFrontmatterSchema,
  pageMessagesSchema,
} from "@/lib/content/schemas";

export type LoadedConceptPage = {
  frontmatter: PageFrontmatter;
  messages: PageMessages;
  assets: PageAssetConfig;
  content: ReactElement;
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export async function loadConceptPageFromDisk(
  slug: string,
  locale = "en",
  conceptsDocsRoot = CONCEPTS_DOCS_ROOT,
): Promise<LoadedConceptPage> {
  const pageDir = join(conceptsDocsRoot, slug);
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
  };
}
