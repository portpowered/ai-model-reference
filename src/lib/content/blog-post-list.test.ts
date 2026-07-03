import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compareBlogPostsByPublishedAtNewestFirst,
  listPublishedBlogPosts,
  type PublishedBlogPostRecord,
} from "./blog-post-list";

function frontmatterBlock(input: {
  status: "published" | "draft";
  publishedAt: string;
  updatedAt?: string;
}): string {
  return `---
messageNamespace: "local"
assetNamespace: "local"
publishedAt: "${input.publishedAt}"
updatedAt: "${input.updatedAt ?? input.publishedAt}"
authors:
  - "site-team"
tags:
  - example-tag
relatedDocIds:
  - concept.example-concept
status: "${input.status}"
---

# Example Post
`;
}

const validMessages = {
  title: "Example Blog Post",
  description: "A fixture post for list loading tests.",
  contextSentence: "This post exists only in tests.",
  takeaway: "Published posts appear in the list.",
};

describe("listPublishedBlogPosts", () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  async function writeFixturePost(input: {
    slug: string;
    status: "published" | "draft";
    publishedAt: string;
    title?: string;
  }) {
    if (!tempRoot) {
      tempRoot = await mkdtemp(join(tmpdir(), "blog-post-list-"));
    }

    const pageDir = join(tempRoot, input.slug);
    await mkdir(join(pageDir, "messages"), { recursive: true });
    await writeFile(
      join(pageDir, "page.mdx"),
      frontmatterBlock({
        status: input.status,
        publishedAt: input.publishedAt,
      }),
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({
        ...validMessages,
        title: input.title ?? `${input.slug} title`,
      }),
    );

    return { blogRoot: tempRoot, slug: input.slug };
  }

  test("returns an empty list when the blog content root is missing", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-post-list-empty-"));
    const missingRoot = join(tempRoot, "no-blog-dir");

    await expect(
      listPublishedBlogPosts({ blogRoot: missingRoot }),
    ).resolves.toEqual([]);
  });

  test("excludes draft posts from the published list", async () => {
    await writeFixturePost({
      slug: "draft-only",
      status: "draft",
      publishedAt: "2026-06-01",
    });

    const posts = await listPublishedBlogPosts({ blogRoot: tempRoot });

    expect(posts).toEqual([]);
  });

  test("returns published posts newest-first by publishedAt", async () => {
    await writeFixturePost({
      slug: "older-post",
      status: "published",
      publishedAt: "2026-05-01",
      title: "Older Post",
    });
    await writeFixturePost({
      slug: "newer-post",
      status: "published",
      publishedAt: "2026-06-15",
      title: "Newer Post",
    });
    await writeFixturePost({
      slug: "middle-post",
      status: "published",
      publishedAt: "2026-06-01",
      title: "Middle Post",
    });
    await writeFixturePost({
      slug: "hidden-draft",
      status: "draft",
      publishedAt: "2026-07-01",
      title: "Hidden Draft",
    });

    const posts = await listPublishedBlogPosts({ blogRoot: tempRoot });

    expect(posts.map((post) => post.slug)).toEqual([
      "newer-post",
      "middle-post",
      "older-post",
    ]);
    expect(posts.map((post) => post.frontmatter.publishedAt)).toEqual([
      "2026-06-15",
      "2026-06-01",
      "2026-05-01",
    ]);
  });

  test("includes route-ready slug, frontmatter, and messages for index cards", async () => {
    const { slug } = await writeFixturePost({
      slug: "index-card-post",
      status: "published",
      publishedAt: "2026-06-10",
      title: "Index Card Post",
    });

    const posts = await listPublishedBlogPosts({ blogRoot: tempRoot });
    const post = posts.find((candidate) => candidate.slug === slug);

    expect(post).toMatchObject({
      slug: "index-card-post",
      sourcePath: join(tempRoot as string, slug, "page.mdx"),
      frontmatter: {
        status: "published",
        publishedAt: "2026-06-10",
        authors: ["site-team"],
        tags: ["example-tag"],
        relatedDocIds: ["concept.example-concept"],
      },
      messages: {
        title: "Index Card Post",
        description: validMessages.description,
      },
    });
  });
});

describe("compareBlogPostsByPublishedAtNewestFirst", () => {
  test("uses slug as a deterministic tie-breaker for equal publishedAt values", () => {
    const posts = [
      {
        slug: "beta-post",
        frontmatter: { publishedAt: "2026-06-01" },
      },
      {
        slug: "alpha-post",
        frontmatter: { publishedAt: "2026-06-01" },
      },
    ] as Array<Pick<PublishedBlogPostRecord, "slug" | "frontmatter">>;

    const sorted = [...posts].sort(compareBlogPostsByPublishedAtNewestFirst);

    expect(sorted.map((post) => post.slug)).toEqual([
      "alpha-post",
      "beta-post",
    ]);
  });
});
