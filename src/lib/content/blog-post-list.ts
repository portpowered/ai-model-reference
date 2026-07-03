import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isBlogPostPubliclyVisible } from "@/lib/content/blog-frontmatter";
import {
  type LoadedBlogPostSidecars,
  loadBlogPostSidecars,
  readBlogPostFrontmatter,
} from "@/lib/content/blog-post-load";
import { BLOG_ROOT } from "@/lib/content/content-paths";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

export type PublishedBlogPostRecord = LoadedBlogPostSidecars;

export type ListPublishedBlogPostsOptions = {
  /** Blog content root override for fixture tests (defaults to `BLOG_ROOT`). */
  blogRoot?: string;
  locale?: SiteLocale;
};

export function discoverBlogPostSlugs(blogRoot: string): string[] {
  if (!existsSync(blogRoot)) {
    return [];
  }

  const slugs: string[] = [];
  for (const entry of readdirSync(blogRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const pageMdx = join(blogRoot, entry.name, "page.mdx");
    if (existsSync(pageMdx)) {
      slugs.push(entry.name);
    }
  }

  return slugs;
}

export function compareBlogPostsByPublishedAtNewestFirst(
  a: Pick<PublishedBlogPostRecord, "slug" | "frontmatter">,
  b: Pick<PublishedBlogPostRecord, "slug" | "frontmatter">,
): number {
  const dateCompare = b.frontmatter.publishedAt.localeCompare(
    a.frontmatter.publishedAt,
  );
  if (dateCompare !== 0) {
    return dateCompare;
  }

  return a.slug.localeCompare(b.slug);
}

export async function listPublishedBlogPosts(
  options: ListPublishedBlogPostsOptions = {},
): Promise<PublishedBlogPostRecord[]> {
  const blogRoot = options.blogRoot ?? BLOG_ROOT;
  const locale = options.locale ?? defaultLocale;
  const slugs = discoverBlogPostSlugs(blogRoot);

  const published: PublishedBlogPostRecord[] = [];
  for (const slug of slugs) {
    const frontmatter = readBlogPostFrontmatter(slug, { blogRoot });
    if (!isBlogPostPubliclyVisible(frontmatter)) {
      continue;
    }

    published.push(await loadBlogPostSidecars(slug, { blogRoot, locale }));
  }

  return published.sort(compareBlogPostsByPublishedAtNewestFirst);
}
