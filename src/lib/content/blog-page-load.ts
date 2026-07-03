import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TOCItemType } from "fumadocs-core/toc";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { blogMdxComponents } from "@/lib/content/blog-mdx-components";
import { getBlogPageDir, getBlogRoot } from "@/lib/content/content-paths";
import { moduleMdxCompileOptions } from "@/lib/content/mdx-compile-options";
import { loadPageMessages } from "@/lib/content/page-messages-load";
import {
  type BlogPostFrontmatter,
  blogPostFrontmatterSchema,
  type PageAssetConfig,
  type PageMessages,
} from "@/lib/content/schemas";
import {
  defaultLocale,
  localizePath,
  type SiteLocale,
} from "@/lib/i18n/locale-routing";
import { buildLocalDocsTableOfContents } from "@/lib/navigation/local-docs-toc";

export type LoadedBlogPost = {
  slug: string;
  frontmatter: BlogPostFrontmatter;
  messages: PageMessages;
  assets: PageAssetConfig;
  content: ReactElement;
  toc: TOCItemType[];
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function blogPostHref(
  slug: string,
  locale: SiteLocale = defaultLocale,
): string {
  return localizePath(`/blog/${slug}`, locale);
}

export function blogIndexHref(locale: SiteLocale = defaultLocale): string {
  return localizePath("/blog", locale);
}

export function listBlogSlugs(blogRoot = getBlogRoot()): string[] {
  if (!existsSync(blogRoot)) {
    return [];
  }

  return readdirSync(blogRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => existsSync(join(blogRoot, slug, "page.mdx")))
    .sort((left, right) => left.localeCompare(right));
}

export type LoadBlogPostFromDiskOptions = {
  /** Blog content root override for fixture tests (defaults to production `BLOG_ROOT`). */
  blogRoot?: string;
};

export async function loadBlogPostFromDisk(
  slug: string,
  locale: SiteLocale = defaultLocale,
  options: LoadBlogPostFromDiskOptions = {},
): Promise<LoadedBlogPost> {
  const pageDir = getBlogPageDir(slug, options.blogRoot);
  const mdxPath = join(pageDir, "page.mdx");
  const assetsPath = join(pageDir, "assets.json");
  const route = blogPostHref(slug, locale);

  const source = readFileSync(mdxPath, "utf8");
  const messages = await loadPageMessages(pageDir, locale, { route });
  const assets = existsSync(assetsPath)
    ? parsePageAssetConfig(readJsonFile(assetsPath))
    : {};

  const { content, frontmatter } = await compileMDX<BlogPostFrontmatter>({
    source,
    components: blogMdxComponents,
    options: moduleMdxCompileOptions,
  });

  const parsedFrontmatter = blogPostFrontmatterSchema.parse(frontmatter);

  return {
    slug,
    frontmatter: parsedFrontmatter,
    messages,
    assets,
    content,
    toc: buildLocalDocsTableOfContents(source, messages),
  };
}

export async function listPublishedBlogPosts(
  locale: SiteLocale = defaultLocale,
): Promise<LoadedBlogPost[]> {
  const posts = await Promise.all(
    listBlogSlugs().map((slug) => loadBlogPostFromDisk(slug, locale)),
  );

  return posts
    .filter((post) => post.frontmatter.status === "published")
    .sort((left, right) =>
      right.frontmatter.publishedAt.localeCompare(left.frontmatter.publishedAt),
    );
}
