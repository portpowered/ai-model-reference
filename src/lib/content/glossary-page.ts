import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { moduleMdxComponents } from "@/lib/content/mdx-components";
import {
  type PageAssetConfig,
  type PageFrontmatter,
  type PageMessages,
  pageFrontmatterSchema,
  pageMessagesSchema,
} from "@/lib/content/schemas";

const CONTENT_ROOT = join(process.cwd(), "src/content/docs/glossary");

export type LoadedGlossaryPage = {
  frontmatter: PageFrontmatter;
  messages: PageMessages;
  assets: PageAssetConfig;
  content: ReactElement;
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export async function loadGlossaryPage(
  slug: string,
  locale = "en",
): Promise<LoadedGlossaryPage> {
  const pageDir = join(CONTENT_ROOT, slug);
  const mdxPath = join(pageDir, "page.mdx");
  const messagesPath = join(pageDir, "messages", `${locale}.json`);
  const assetsPath = join(pageDir, "assets.json");

  const source = readFileSync(mdxPath, "utf8");
  const messages = pageMessagesSchema.parse(readJsonFile(messagesPath));
  const assets = parsePageAssetConfig(readJsonFile(assetsPath));

  const { content, frontmatter } = await compileMDX<PageFrontmatter>({
    source,
    components: moduleMdxComponents,
    options: {
      parseFrontmatter: true,
    },
  });

  const parsedFrontmatter = pageFrontmatterSchema.parse(frontmatter);

  return {
    frontmatter: parsedFrontmatter,
    messages,
    assets,
    content,
  };
}
