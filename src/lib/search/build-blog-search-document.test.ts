import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import {
  BLOG_SEARCH_DOCUMENT_KIND,
  buildBlogSearchDocuments,
  extractBlogMdxSearchText,
  loadBlogSearchPostSources,
} from "@/lib/search/build-blog-search-document";
import { buildSearchDocumentsForLocale } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

function publishedFrontmatterBlock(
  overrides: Record<string, unknown> = {},
): string {
  const frontmatter = {
    messageNamespace: "local",
    assetNamespace: "local",
    publishedAt: "2026-06-02",
    updatedAt: "2026-06-02",
    authors: ["site-team"],
    tags: ["kv-cache"],
    relatedDocIds: ["concept.prefill"],
    status: "published",
    ...overrides,
  };

  const lines = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${JSON.stringify(item)}`);
      }
      continue;
    }

    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  lines.push("---", "", "# Example Post", "");

  return lines.join("\n");
}

const validMessages = {
  title: "KV Cache Serving Notes",
  description: "How KV cache reuse shapes decode throughput.",
  contextSentence: "Decode steps reuse cached key-value tensors from prefill.",
  takeaway: "Serving throughput depends on how much KV state you retain.",
};

describe("buildBlogSearchDocuments", () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  async function writeFixturePost(input: {
    slug: string;
    frontmatter?: string;
    messages?: unknown;
    mdxBody?: string;
  }) {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-search-documents-"));
    const pageDir = join(tempRoot, input.slug);
    await mkdir(join(pageDir, "messages"), { recursive: true });
    const frontmatter = input.frontmatter ?? publishedFrontmatterBlock();
    const mdxBody =
      input.mdxBody ??
      "\n## Memory bandwidth limits\n\nThroughput can plateau when weight reads dominate.\n";
    await writeFile(join(pageDir, "page.mdx"), `${frontmatter}${mdxBody}`);
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify(input.messages ?? validMessages),
    );

    return { blogRoot: tempRoot, slug: input.slug };
  }

  test("indexes published blog posts with blog kind, route, metadata, tags, and published date", async () => {
    const { blogRoot } = await writeFixturePost({ slug: "kv-cache-notes" });
    const indexes = await loadRegistry();
    const posts = await loadBlogSearchPostSources({ blogRoot });

    const [document] = buildBlogSearchDocuments(posts, indexes);

    expect(document).toMatchObject({
      id: "/blog/kv-cache-notes",
      url: "/blog/kv-cache-notes",
      kind: BLOG_SEARCH_DOCUMENT_KIND,
      title: validMessages.title,
      description: validMessages.description,
      publishedAt: "2026-06-02",
      tags: ["kv-cache"],
      relatedIds: ["concept.prefill"],
    });
    expect(document.bodyText).toContain(validMessages.contextSentence);
    expect(document.bodyText).toContain("Memory bandwidth limits");
    expect(document.headings).toContain("Memory bandwidth limits");
    expect(document.aliases).toContain("kv-cache");
  });

  test("excludes draft posts from search post sources", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "draft-only",
      frontmatter: publishedFrontmatterBlock({ status: "draft" }),
    });

    const posts = await loadBlogSearchPostSources({ blogRoot });

    expect(posts).toEqual([]);
  });

  test("extractBlogMdxSearchText keeps markdown prose and headings while stripping components", () => {
    const mdxBody = `
import { T } from "@/features/docs/components/T";

# <T k="title" />

## Why throughput plateaus

Serving repeatedly reads weights from memory.

<RooflineThroughputExplorerFromRegistry />
`;

    const extracted = extractBlogMdxSearchText(mdxBody);

    expect(extracted.headings).toEqual(["Why throughput plateaus"]);
    expect(extracted.bodyText).toContain(
      "Serving repeatedly reads weights from memory.",
    );
    expect(extracted.bodyText).not.toContain("RooflineThroughputExplorer");
  });

  test("buildSearchDocumentsForLocale keeps canonical docs documents unchanged when blogs are added", async () => {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const withoutBlogs = buildSearchDocumentsForLocale("en", indexes, pages);
    const { blogRoot } = await writeFixturePost({ slug: "fixture-post" });
    const blogPosts = await loadBlogSearchPostSources({ blogRoot });
    const withBlogs = buildSearchDocumentsForLocale(
      "en",
      indexes,
      pages,
      blogPosts,
    );

    expect(withBlogs.length).toBe(withoutBlogs.length + 1);
    expect(
      withBlogs.filter(
        (document) => document.kind !== BLOG_SEARCH_DOCUMENT_KIND,
      ),
    ).toEqual(withoutBlogs);
  });

  test(
    "search returns published blog posts for title, body phrase, and tag queries",
    async () => {
      const titleResults = await docsSearchApi.search(
        "Why throughput follows a roofline",
      );
      expect(
        titleResults.some(
          (result) => result.url === "/blog/roofline-throughput-explorer",
        ),
      ).toBe(true);

      const bodyResults = await docsSearchApi.search("memory-bound limit");
      expect(
        bodyResults.some(
          (result) => result.url === "/blog/roofline-throughput-explorer",
        ),
      ).toBe(true);

      const tagResults = await docsSearchApi.search("kv-cache", {
        tag: ["kv-cache"],
      });
      expect(
        tagResults.some(
          (result) => result.url === "/blog/roofline-throughput-explorer",
        ),
      ).toBe(true);

      const docsResults = await docsSearchApi.search("grouped query attention");
      expect(
        docsResults.some((result) =>
          result.url.includes("/docs/modules/grouped-query-attention"),
        ),
      ).toBe(true);
    },
    { timeout: 20_000 },
  );
});
