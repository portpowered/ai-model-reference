import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BlogPostLoadError, loadBlogPostSidecars } from "./blog-post-load";

const publishedFrontmatter = `---
messageNamespace: "local"
assetNamespace: "local"
publishedAt: "2026-06-02"
updatedAt: "2026-06-02"
authors:
  - "site-team"
tags:
  - example-tag
relatedDocIds:
  - concept.example-concept
status: "published"
---

# Example Post
`;

const validMessages = {
  title: "Example Blog Post",
  description: "A fixture post for sidecar loading tests.",
  contextSentence: "This post exists only in tests.",
  takeaway: "Sidecars load from colocated files.",
};

describe("loadBlogPostSidecars", () => {
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
    assets?: unknown;
    includeAssets?: boolean;
    includeMessages?: boolean;
  }) {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-post-sidecars-"));
    const pageDir = join(tempRoot, input.slug);
    await mkdir(join(pageDir, "messages"), { recursive: true });
    await writeFile(
      join(pageDir, "page.mdx"),
      input.frontmatter ?? publishedFrontmatter,
    );

    if (input.includeMessages !== false) {
      await writeFile(
        join(pageDir, "messages", "en.json"),
        JSON.stringify(input.messages ?? validMessages),
      );
    }

    if (input.includeAssets !== false && input.assets !== undefined) {
      await writeFile(
        join(pageDir, "assets.json"),
        JSON.stringify(input.assets),
      );
    } else if (input.includeAssets === true) {
      await writeFile(
        join(pageDir, "assets.json"),
        JSON.stringify(input.assets ?? {}),
      );
    }

    return { blogRoot: tempRoot, slug: input.slug, pageDir };
  }

  test("loads local messages and assets for a fixture blog post", async () => {
    const assets = {
      hero: {
        type: "image" as const,
        src: "/images/blog/example.png",
        altKey: "assets.hero.alt",
      },
    };
    const { blogRoot, slug } = await writeFixturePost({
      slug: "example-post",
      assets,
      includeAssets: true,
    });

    const loaded = await loadBlogPostSidecars(slug, { blogRoot });

    expect(loaded.slug).toBe("example-post");
    expect(loaded.sourcePath).toBe(join(blogRoot, slug, "page.mdx"));
    expect(loaded.frontmatter.status).toBe("published");
    expect(loaded.messages).toEqual(validMessages);
    expect(loaded.assets).toEqual(assets);
  });

  test("returns an empty asset map when assets.json is missing", async () => {
    const { blogRoot, slug } = await writeFixturePost({
      slug: "no-assets",
      includeAssets: false,
    });

    const loaded = await loadBlogPostSidecars(slug, { blogRoot });

    expect(loaded.assets).toEqual({});
    expect(loaded.messages.title).toBe(validMessages.title);
  });

  test("throws a loader error that identifies the slug when local messages are missing", async () => {
    const { blogRoot, slug } = await writeFixturePost({
      slug: "missing-messages",
      includeMessages: false,
    });

    await expect(
      loadBlogPostSidecars(slug, { blogRoot }),
    ).rejects.toMatchObject({
      name: "BlogPostLoadError",
      slug: "missing-messages",
      message: expect.stringContaining('blog post "missing-messages"'),
    });
  });

  test("throws a loader error that identifies the source path when local messages are invalid", async () => {
    const { blogRoot, slug, pageDir } = await writeFixturePost({
      slug: "invalid-messages",
      messages: {
        title: "",
        description: "Missing a non-empty title.",
      },
    });
    const messagesPath = join(pageDir, "messages", "en.json");

    try {
      await loadBlogPostSidecars(slug, { blogRoot });
      throw new Error("Expected loadBlogPostSidecars to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(BlogPostLoadError);
      const loadError = error as BlogPostLoadError;
      expect(loadError.slug).toBe("invalid-messages");
      expect(loadError.sourcePath).toBe(join(pageDir, "page.mdx"));
      expect(loadError.message).toContain(messagesPath);
    }
  });
});
