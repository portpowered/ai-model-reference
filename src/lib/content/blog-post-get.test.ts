import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPublishedBlogPostBySlug } from "./blog-post-get";

function frontmatterBlock(input: {
  status: "published" | "draft";
  publishedAt?: string;
}): string {
  const publishedAt = input.publishedAt ?? "2026-06-02";
  return `---
messageNamespace: "local"
assetNamespace: "local"
publishedAt: "${publishedAt}"
updatedAt: "${publishedAt}"
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
  description: "A fixture post for single-slug loading tests.",
  contextSentence: "This post exists only in tests.",
  takeaway: "Published posts load by slug.",
};

describe("getPublishedBlogPostBySlug", () => {
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
    publishedAt?: string;
    title?: string;
    assets?: Record<string, unknown>;
    includeAssets?: boolean;
  }) {
    if (!tempRoot) {
      tempRoot = await mkdtemp(join(tmpdir(), "blog-post-get-"));
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

    if (input.includeAssets) {
      await writeFile(
        join(pageDir, "assets.json"),
        JSON.stringify(input.assets ?? {}),
      );
    }

    return { blogRoot: tempRoot, slug: input.slug, pageDir };
  }

  test("returns a published post with slug, frontmatter, messages, assets, and source path", async () => {
    const assets = {
      hero: {
        type: "image" as const,
        src: "/images/blog/example.png",
        altKey: "assets.hero.alt",
      },
    };
    const { slug, pageDir } = await writeFixturePost({
      slug: "published-post",
      status: "published",
      publishedAt: "2026-06-10",
      title: "Published Post Title",
      assets,
      includeAssets: true,
    });

    const post = await getPublishedBlogPostBySlug(slug, { blogRoot: tempRoot });

    expect(post).toMatchObject({
      slug: "published-post",
      sourcePath: join(pageDir, "page.mdx"),
      frontmatter: {
        status: "published",
        publishedAt: "2026-06-10",
        authors: ["site-team"],
        tags: ["example-tag"],
        relatedDocIds: ["concept.example-concept"],
      },
      messages: {
        title: "Published Post Title",
        description: validMessages.description,
        contextSentence: validMessages.contextSentence,
        takeaway: validMessages.takeaway,
      },
      assets,
    });
  });

  test("returns null for a draft fixture slug without loading sidecars", async () => {
    await writeFixturePost({
      slug: "draft-post",
      status: "draft",
      title: "Draft Post Title",
    });

    const post = await getPublishedBlogPostBySlug("draft-post", {
      blogRoot: tempRoot,
    });

    expect(post).toBeNull();
  });

  test("returns null for an unknown slug", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-post-get-unknown-"));

    const post = await getPublishedBlogPostBySlug("missing-post", {
      blogRoot: tempRoot,
    });

    expect(post).toBeNull();
  });

  test("returns an empty asset map when assets.json is absent", async () => {
    const { slug } = await writeFixturePost({
      slug: "no-assets-post",
      status: "published",
    });

    const post = await getPublishedBlogPostBySlug(slug, { blogRoot: tempRoot });

    expect(post?.assets).toEqual({});
  });
});
