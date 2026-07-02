import { existsSync } from "node:fs";
import { join } from "node:path";
import { isBlogPostPubliclyVisible } from "@/lib/content/blog-frontmatter";
import type {
  ListPublishedBlogPostsOptions,
  PublishedBlogPostRecord,
} from "@/lib/content/blog-post-list";
import {
  loadBlogPostSidecars,
  readBlogPostFrontmatter,
} from "@/lib/content/blog-post-load";
import { BLOG_ROOT } from "@/lib/content/content-paths";
import { defaultLocale } from "@/lib/i18n/locale-routing";

export type GetPublishedBlogPostBySlugOptions = ListPublishedBlogPostsOptions;

function blogPostMdxPath(blogRoot: string, slug: string): string {
  return join(blogRoot, slug, "page.mdx");
}

export async function getPublishedBlogPostBySlug(
  slug: string,
  options: GetPublishedBlogPostBySlugOptions = {},
): Promise<PublishedBlogPostRecord | null> {
  const blogRoot = options.blogRoot ?? BLOG_ROOT;
  const sourcePath = blogPostMdxPath(blogRoot, slug);

  if (!existsSync(sourcePath)) {
    return null;
  }

  const frontmatter = readBlogPostFrontmatter(slug, { blogRoot });
  if (!isBlogPostPubliclyVisible(frontmatter)) {
    return null;
  }

  return loadBlogPostSidecars(slug, {
    blogRoot,
    locale: options.locale ?? defaultLocale,
  });
}
