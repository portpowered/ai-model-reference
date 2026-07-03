/**
 * Lane isolation proof for the blog content loader foundation.
 * Verifies loader APIs stay blog-owned and public shell surfaces remain blog-free.
 */
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBrowseIndexPage } from "@/app/(site)/site-renderers";
import * as blogFrontmatter from "@/lib/content/blog-frontmatter";
import { getPublishedBlogPostBySlug } from "@/lib/content/blog-post-get";
import { listPublishedBlogPosts } from "@/lib/content/blog-post-list";
import * as blogPostLoad from "@/lib/content/blog-post-load";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { collectSidebarPageLinks } from "@/lib/navigation/docs-sidebar-contract";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { source } from "@/lib/source";

const BLOG_URL_PREFIX = "/blog";

function expectExportDefined(
  module: Record<string, unknown>,
  exportName: string,
): void {
  expect(module[exportName]).toBeDefined();
}

describe("blog content loader lane isolation", () => {
  test("production blog root resolves committed published posts", async () => {
    const posts = await listPublishedBlogPosts();
    expect(posts.some((post) => post.slug === "roofline-throughput-explorer")).toBe(
      true,
    );
    await expect(
      getPublishedBlogPostBySlug("example-post"),
    ).resolves.toBeNull();
  });

  test("blog loader public APIs are consumable from blog-owned modules", () => {
    expectExportDefined(blogFrontmatter, "parseBlogPostFrontmatter");
    expectExportDefined(blogFrontmatter, "isBlogPostPubliclyVisible");
    expectExportDefined(blogPostLoad, "loadBlogPostSidecars");
    expectExportDefined(blogPostLoad, "readBlogPostFrontmatter");
    expect(typeof listPublishedBlogPosts).toBe("function");
    expect(typeof getPublishedBlogPostBySlug).toBe("function");
  });

  test("public browse, sidebar, and search catalogs do not expose blog routes", async () => {
    const browseHtml = renderToStaticMarkup(await renderBrowseIndexPage());
    const sidebarUrls = collectSidebarPageLinks(source.pageTree).map(
      (link) => link.url,
    );
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const searchUrls = buildSearchDocuments(pages, registry).map(
      (document) => document.url,
    );

    expect(browseHtml).not.toContain(BLOG_URL_PREFIX);
    expect(sidebarUrls.some((url) => url.startsWith(BLOG_URL_PREFIX))).toBe(
      false,
    );
    expect(searchUrls.some((url) => url.startsWith(BLOG_URL_PREFIX))).toBe(
      false,
    );
  });
});
