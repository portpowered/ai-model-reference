import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRegistry } from "./registry";
import { validatePublishedBlogPosts } from "./validate-blog-posts";
import { validateRegistryContent } from "./validate-registry";

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
  title: "Example Blog Post",
  description: "A fixture post for blog validation tests.",
  contextSentence: "This post exists only in tests.",
  takeaway: "Validation should identify the blog route.",
};

describe("validatePublishedBlogPosts", () => {
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
    includeMessages?: boolean;
    includeAssets?: boolean;
  }) {
    tempRoot = await mkdtemp(join(tmpdir(), "validate-blog-posts-"));
    const pageDir = join(tempRoot, input.slug);
    await mkdir(join(pageDir, "messages"), { recursive: true });
    await writeFile(
      join(pageDir, "page.mdx"),
      input.frontmatter ?? publishedFrontmatterBlock(),
    );

    if (input.includeMessages !== false) {
      await writeFile(
        join(pageDir, "messages", "en.json"),
        JSON.stringify(input.messages ?? validMessages),
      );
    }

    if (input.includeAssets) {
      await writeFile(
        join(pageDir, "assets.json"),
        JSON.stringify(input.assets ?? {}),
      );
    }

    return { blogRoot: tempRoot, slug: input.slug, pageDir };
  }

  test("accepts a valid published blog fixture with local messages and empty assets", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "valid-post",
      includeAssets: true,
      assets: {},
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual([]);
  });

  test("skips draft posts without requiring tag or related-doc resolution", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "draft-post",
      frontmatter: publishedFrontmatterBlock({
        status: "draft",
        tags: ["missing-tag"],
        relatedDocIds: ["concept.missing-target"],
      }),
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual([]);
  });

  test("reports invalid frontmatter with the blog route", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "bad-dates",
      frontmatter: publishedFrontmatterBlock({
        publishedAt: "2026-13-01",
      }),
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(
      errors.some((error) => error.message.includes("/blog/bad-dates")),
    ).toBe(true);
    expect(
      errors.some((error) => error.code === "invalid-blog-frontmatter"),
    ).toBe(true);
  });

  test("rejects unsupported message and asset namespaces for published posts", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "remote-sidecars",
      frontmatter: publishedFrontmatterBlock({
        messageNamespace: "remote",
        assetNamespace: "remote",
      }),
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unsupported-blog-message-namespace",
          message: expect.stringContaining("/blog/remote-sidecars"),
        }),
        expect.objectContaining({
          code: "unsupported-blog-asset-namespace",
          message: expect.stringContaining("/blog/remote-sidecars"),
        }),
      ]),
    );
  });

  test("rejects published posts with empty authors", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "no-authors",
      frontmatter: publishedFrontmatterBlock({
        authors: [],
      }),
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual([
      expect.objectContaining({
        code: "missing-blog-authors",
        message: expect.stringContaining("/blog/no-authors"),
      }),
    ]);
  });

  test("rejects unresolved tags and relatedDocIds for published posts", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "broken-links",
      frontmatter: publishedFrontmatterBlock({
        tags: ["missing-tag"],
        relatedDocIds: ["concept.missing-target"],
      }),
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unresolved-blog-tag",
          message: expect.stringContaining('tag "missing-tag"'),
        }),
        expect.objectContaining({
          code: "unresolved-blog-related-doc",
          message: expect.stringContaining(
            'relatedDocIds entry "concept.missing-target"',
          ),
        }),
      ]),
    );
  });

  test("requires default locale messages with title and description", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "broken-messages",
      includeMessages: true,
      messages: {
        title: "",
        description: "Missing a non-empty title.",
      },
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual([
      expect.objectContaining({
        code: "invalid-blog-messages",
        message: expect.stringContaining("/blog/broken-messages"),
      }),
    ]);
  });

  test("reports missing default locale messages for local messageNamespace", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "missing-messages",
      includeMessages: false,
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual([
      expect.objectContaining({
        code: "missing-blog-messages",
        message: expect.stringContaining("/blog/missing-messages"),
      }),
    ]);
  });

  test("validates local asset config when assets.json is present", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "broken-assets",
      includeAssets: true,
      assets: {
        hero: {
          type: "image",
          src: "/images/blog/example.png",
        },
      },
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual([
      expect.objectContaining({
        code: "invalid-blog-assets",
        message: expect.stringContaining("/blog/broken-assets"),
      }),
    ]);
  });

  test("accepts missing assets.json as an explicit empty asset set", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "no-assets-file",
      includeAssets: false,
    });
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual([]);
  });
});

describe("validateRegistryContent blog integration", () => {
  test("validates committed published blog posts through validateRegistryContent", async () => {
    const errors = await validateRegistryContent();
    const blogErrors = errors.filter((error) =>
      error.message.includes("/blog/"),
    );

    expect(blogErrors).toEqual([]);
  });
});
