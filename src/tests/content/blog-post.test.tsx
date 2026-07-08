import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBlogPostPage } from "@/app/(site)/site-renderers";

function frontmatterBlock(input: {
  status: "published" | "draft";
  publishedAt: string;
  tags?: string[];
  authors?: string[];
}): string {
  const tags = input.tags ?? ["inference"];
  const authors = input.authors ?? ["site-team"];
  return `---
messageNamespace: "local"
assetNamespace: "local"
publishedAt: "${input.publishedAt}"
updatedAt: "${input.publishedAt}"
authors:
${authors.map((author) => `  - "${author}"`).join("\n")}
tags:
${tags.map((tag) => `  - ${tag}`).join("\n")}
relatedDocIds:
  - concept.example-concept
status: "${input.status}"
---

## Fixture body

Fixture paragraph for blog post route tests.
`;
}

const validMessages = {
  title: "Fixture Blog Post",
  description: "A fixture post for blog post route tests.",
  contextSentence: "This post exists only in tests.",
  takeaway: "Published posts render through the blog route.",
};

describe("blog post page render", () => {
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
    tags?: string[];
    authors?: string[];
  }) {
    if (!tempRoot) {
      tempRoot = await mkdtemp(join(tmpdir(), "blog-post-route-"));
    }

    const pageDir = join(tempRoot, input.slug);
    await mkdir(join(pageDir, "messages"), { recursive: true });
    await writeFile(
      join(pageDir, "page.mdx"),
      frontmatterBlock({
        status: input.status,
        publishedAt: input.publishedAt ?? "2026-06-10",
        tags: input.tags,
        authors: input.authors,
      }),
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({
        ...validMessages,
        title: input.title ?? validMessages.title,
      }),
    );
  }

  it("renders the production roofline max throughput post with metadata and MDX body content", async () => {
    const page = await renderBlogPostPage("roofline-max-throughput");
    const html = renderToStaticMarkup(page);

    expect(html).toContain(
      "Roofline maximum throughput: when bandwidth beats peak FLOPs",
    );
    expect(html).toContain(
      "How memory bandwidth, compute FLOPs, precision, and active weight size",
    );
    expect(html).toContain('dateTime="2026-07-08"');
    expect(html).toContain("July 8, 2026");
    expect(html).toContain('class="sr-only">Authors: </span>');
    expect(html).toContain("Site Team");
    expect(html).toContain("Foundations");
    expect(html).toContain("Kv Cache");
    expect(html).toContain('data-blog-slug="roofline-max-throughput"');
    expect(html).toContain("Peak FLOPs is not the full throughput story");
    expect(html).toContain(
      "When weight reads, precision, and bandwidth dominate",
    );
    expect(html).toContain("Explore the maximum-throughput bound");
    expect(html).toContain('data-roofline-throughput-explorer="explorer"');
    expect(html).toContain('data-testid="roofline-model-preset"');
    expect(html).toContain('data-testid="blog-related-docs"');
    expect(html).toContain('href="/docs/concepts/roofline-model"');
    expect(html).toContain('href="/docs/concepts/memory-bandwidth"');
    expect(html).toContain('href="/docs/concepts/flops"');
    expect(html).toContain('href="/docs/glossary/tokens-per-second"');
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/glossary/decode"');
    expect(html).toContain('href="/docs/concepts/prefill-decode-split"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
  });

  it("renders the production roofline post with metadata and MDX body content", async () => {
    const page = await renderBlogPostPage("roofline-throughput-explorer");
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Why throughput follows a roofline");
    expect(html).toContain(
      "An interactive roofline view of how memory bandwidth",
    );
    expect(html).toContain('dateTime="2026-07-02"');
    expect(html).toContain("July 2, 2026");
    expect(html).toContain('class="sr-only">Authors: </span>');
    expect(html).toContain("Site Team");
    expect(html).toContain("Foundations");
    expect(html).toContain("Kv Cache");
    expect(html).toContain('data-blog-slug="roofline-throughput-explorer"');
    expect(html).toContain("Why active weight reads can cap throughput");
    expect(html).toContain('data-roofline-throughput-explorer="explorer"');
  });

  it("renders fixture post metadata and MDX body content", async () => {
    await writeFixturePost({
      slug: "fixture-post",
      status: "published",
      publishedAt: "2026-06-10",
      title: "Fixture Blog Post",
      tags: ["attention", "kv-cache"],
      authors: ["site-team", "editor"],
    });

    const page = await renderBlogPostPage("fixture-post", "en", {
      blogRoot: tempRoot,
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Fixture Blog Post");
    expect(html).toContain(validMessages.description);
    expect(html).toContain('dateTime="2026-06-10"');
    expect(html).toContain('class="sr-only">Authors: </span>');
    expect(html).toContain("Site Team, Editor");
    expect(html).toContain("Attention");
    expect(html).toContain("Kv Cache");
    expect(html).toContain('data-blog-slug="fixture-post"');
    expect(html).toContain("Fixture paragraph for blog post route tests.");
  });

  it("returns missing-page behavior for an unknown slug", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-post-route-unknown-"));

    try {
      await renderBlogPostPage("missing-post", "en", { blogRoot: tempRoot });
      throw new Error("Expected unknown blog slug to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });

  it("returns missing-page behavior for a draft fixture slug", async () => {
    await writeFixturePost({
      slug: "draft-only",
      status: "draft",
      title: "Hidden Draft",
    });

    try {
      await renderBlogPostPage("draft-only", "en", { blogRoot: tempRoot });
      throw new Error("Expected draft blog slug to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });
});
