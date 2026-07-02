import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TOCItemType } from "fumadocs-core/toc";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { SYSTEMS_DOCS_ROOT } from "@/lib/content/content-paths";
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

export type LoadedSystemPage = {
  frontmatter: PageFrontmatter;
  messages: PageMessages;
  assets: PageAssetConfig;
  content: ReactElement;
  toc: TOCItemType[];
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export async function loadSystemPageFromDisk(
  slug: string,
  locale: SiteLocale = defaultLocale,
  systemsDocsRoot = SYSTEMS_DOCS_ROOT,
): Promise<LoadedSystemPage> {
  const pageDir = join(systemsDocsRoot, slug);
  const mdxPath = join(pageDir, "page.mdx");
  const assetsPath = join(pageDir, "assets.json");
  const route = buildLocalizedRoute(
    { surface: "docs-page", slug: `systems/${slug}` },
    locale,
  );

  const source = readFileSync(mdxPath, "utf8");
  const messages = await loadPageMessages(pageDir, locale, { route });
  const assets = parsePageAssetConfig(readJsonFile(assetsPath));
  syncGraphRegistryForContentRoot(join(systemsDocsRoot, "..", ".."));

  const { content, frontmatter } = await compileMDX<PageFrontmatter>({
    source,
    components: moduleMdxComponents,
    options: moduleMdxCompileOptions,
  });

  return {
    frontmatter: pageFrontmatterSchema.parse(frontmatter),
    messages,
    assets,
    content,
    toc: buildLocalDocsTableOfContents(source, messages),
  };
}
