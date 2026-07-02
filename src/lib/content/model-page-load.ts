import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TOCItemType } from "fumadocs-core/toc";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { MODELS_DOCS_ROOT } from "@/lib/content/content-paths";
import { moduleMdxCompileOptions } from "@/lib/content/mdx-compile-options";
import { moduleMdxComponents } from "@/lib/content/mdx-components";
import { loadPageMessages } from "@/lib/content/page-messages-load";
import { syncGraphRegistryForContentRoot } from "@/lib/content/root-graph-registry-load";
import {
  type PageAssetConfig,
  type PageFrontmatter,
  type PageMessages,
  pageFrontmatterSchema,
} from "@/lib/content/schemas";
import {
  buildLocalizedRoute,
  defaultLocale,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import { buildLocalDocsTableOfContents } from "@/lib/navigation/local-docs-toc";

export type LoadedModelPage = {
  frontmatter: PageFrontmatter;
  messages: PageMessages;
  assets: PageAssetConfig;
  content: ReactElement;
  toc: TOCItemType[];
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export async function loadModelPageFromDisk(
  slug: string,
  locale: SiteLocale = defaultLocale,
  modelsDocsRoot = MODELS_DOCS_ROOT,
): Promise<LoadedModelPage> {
  const pageDir = join(modelsDocsRoot, slug);
  const mdxPath = join(pageDir, "page.mdx");
  const assetsPath = join(pageDir, "assets.json");
  const route = buildLocalizedRoute(
    { surface: "docs-page", slug: `models/${slug}` },
    locale,
  );

  const source = readFileSync(mdxPath, "utf8");
  const messages = await loadPageMessages(pageDir, locale, { route });
  const assets = parsePageAssetConfig(readJsonFile(assetsPath));
  syncGraphRegistryForContentRoot(join(modelsDocsRoot, "..", ".."));

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
