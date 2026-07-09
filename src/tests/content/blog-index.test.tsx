import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBlogIndexPage } from "@/app/(site)/site-renderers";
import { listPublishedBlogPosts } from "@/lib/content/blog-post-list";
import { loadUiMessages } from "@/lib/content/ui-messages";

function frontmatterBlock(input: {
  status: "published" | "draft";
  publishedAt: string;
  tags?: string[];
}): string {
  const tags = input.tags ?? ["inference"];
  return `---
messageNamespace: "local"
assetNamespace: "local"
publishedAt: "${input.publishedAt}"
updatedAt: "${input.publishedAt}"
authors:
  - "site-team"
tags:
${tags.map((tag) => `  - ${tag}`).join("\n")}
relatedDocIds:
  - concept.example-concept
status: "${input.status}"
---

# Example Post
`;
}

const validMessages = {
  title: "Fixture Blog Post",
  description: "A fixture post for blog index route tests.",
  contextSentence: "This post exists only in tests.",
  takeaway: "Published posts appear on the blog index.",
};

function blogPostHrefPosition(html: string, slug: string): number {
  const position = html.indexOf(`href="/blog/${slug}"`);
  expect(position).toBeGreaterThanOrEqual(0);
  return position;
}

describe("blog index messages", () => {
  it("loads localized copy for the blog index page", async () => {
    const messages = await loadUiMessages();
    expect(messages.blogIndex.title).toBe("Blog");
    expect(messages.blogIndex.emptyTitle.length).toBeGreaterThan(0);
    expect(messages.blogIndex.emptyDescription.length).toBeGreaterThan(0);
  });
});

describe("blog index page render", () => {
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
    title: string;
    tags?: string[];
  }) {
    if (!tempRoot) {
      tempRoot = await mkdtemp(join(tmpdir(), "blog-index-route-"));
    }

    const pageDir = join(tempRoot, input.slug);
    await mkdir(join(pageDir, "messages"), { recursive: true });
    await writeFile(
      join(pageDir, "page.mdx"),
      frontmatterBlock({
        status: input.status,
        publishedAt: input.publishedAt,
        tags: input.tags,
      }),
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({
        ...validMessages,
        title: input.title,
      }),
    );
  }

  it("renders the production llms-no-longer-wholly-reliant-on-the-internet post with title, description, date, and tags", async () => {
    const page = await renderBlogIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("LLMs are no longer wholly reliant on the internet");
    expect(html).toContain(
      "Why modern language-model quality still starts with internet-scale pretraining",
    );
    expect(html).toContain('dateTime="2026-07-08"');
    expect(html).toContain("July 8, 2026");
    expect(html).toContain("Foundations");
    expect(html).toContain("Alignment");
    expect(html).toContain(
      'href="/blog/llms-no-longer-wholly-reliant-on-the-internet"',
    );
    expect(html).toContain(
      'aria-label="Read blog post: LLMs are no longer wholly reliant on the internet"',
    );
  });

  it("renders the production roofline post with title, description, date, and tags", async () => {
    const page = await renderBlogIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain(
      "the best computer for local language models (2026)",
    );
    expect(html).toContain(
      "An overall guide to the best computer to buy for local language models",
    );
    expect(html).toContain('dateTime="2026-07-02"');
    expect(html).toContain("July 2, 2026");
    expect(html).toContain("Inference");
    expect(html).toContain("Local Models");
    expect(html).toContain('href="/blog/roofline-throughput-explorer"');
    expect(html).toContain(
      'aria-label="Read blog post: the best computer for local language models (2026)"',
    );
  });

  it("renders fixture posts as compact accessible index cards", async () => {
    await writeFixturePost({
      slug: "fixture-post",
      status: "published",
      publishedAt: "2026-06-10",
      title: "Fixture Blog Post",
      tags: ["attention", "kv-cache"],
    });

    const page = await renderBlogIndexPage("en", { blogRoot: tempRoot });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Fixture Blog Post");
    expect(html).toContain(validMessages.description);
    expect(html).toContain('href="/blog/fixture-post"');
    expect(html).toContain('aria-label="Read blog post: Fixture Blog Post"');
    expect(html).toContain('dateTime="2026-06-10"');
    expect(html).toContain("Attention");
    expect(html).toContain("Kv Cache");
  });

  it("orders index cards newest-first by publishedAt", async () => {
    await writeFixturePost({
      slug: "older-fixture-post",
      status: "published",
      publishedAt: "2026-05-01",
      title: "Older Fixture Post",
    });
    await writeFixturePost({
      slug: "newer-fixture-post",
      status: "published",
      publishedAt: "2026-06-15",
      title: "Newer Fixture Post",
    });
    await writeFixturePost({
      slug: "hidden-newer-draft",
      status: "draft",
      publishedAt: "2026-07-01",
      title: "Hidden Newer Draft",
    });

    const page = await renderBlogIndexPage("en", { blogRoot: tempRoot });
    const html = renderToStaticMarkup(page);

    expect(blogPostHrefPosition(html, "newer-fixture-post")).toBeLessThan(
      blogPostHrefPosition(html, "older-fixture-post"),
    );
    expect(html).not.toContain('href="/blog/hidden-newer-draft"');
  });

  it("renders a clear empty state when no published posts are visible", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-index-empty-"));
    await writeFixturePost({
      slug: "draft-only",
      status: "draft",
      publishedAt: "2026-06-10",
      title: "Hidden Draft",
    });

    const posts = await listPublishedBlogPosts({ blogRoot: tempRoot });
    expect(posts).toEqual([]);

    const page = await renderBlogIndexPage("en", { blogRoot: tempRoot });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("No blog posts yet");
    expect(html).toContain("Published narrative posts will appear here");
    expect(html).not.toContain('href="/blog/draft-only"');
  });
});
