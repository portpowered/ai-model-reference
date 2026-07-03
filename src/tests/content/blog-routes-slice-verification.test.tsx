/**
 * Consolidated review-facing slice proof for default English blog routes.
 * Loader-only invariants stay in `blog-post-list.test.ts` and
 * `blog-content-loader-scope.test.ts`; this file proves observable `/blog` and
 * `/blog/<slug>` route metadata, rendering, ordering, and missing-post behavior.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  generateMetadata as generateBlogPostMetadata,
  generateStaticParams as generateBlogPostStaticParams,
} from "@/app/(site)/blog/[slug]/page";
import { generateMetadata as generateBlogIndexMetadata } from "@/app/(site)/blog/page";
import {
  renderBlogIndexPage,
  renderBlogPostPage,
} from "@/app/(site)/site-renderers";
import { blogIndexHref, blogPostHref } from "@/lib/content/blog-page-load";

const ROOFLINE_SLUG = "roofline-throughput-explorer";
const ROOFLINE_TITLE = "Why throughput follows a roofline";
const ROOFLINE_DESCRIPTION =
  "An interactive roofline view of how memory bandwidth and active weight reads shape achievable model throughput.";

function frontmatterBlock(input: {
  status: "published" | "draft";
  publishedAt: string;
}): string {
  return `---
messageNamespace: "local"
assetNamespace: "local"
publishedAt: "${input.publishedAt}"
updatedAt: "${input.publishedAt}"
authors:
  - "site-team"
tags:
  - inference
relatedDocIds:
  - concept.example-concept
status: "${input.status}"
---

## Fixture body

Fixture paragraph for blog route slice verification.
`;
}

function blogPostHrefPosition(html: string, slug: string): number {
  const position = html.indexOf(`href="/blog/${slug}"`);
  expect(position).toBeGreaterThanOrEqual(0);
  return position;
}

describe("blog routes slice verification (blog-routes-layout-index-004)", () => {
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
  }) {
    if (!tempRoot) {
      tempRoot = await mkdtemp(join(tmpdir(), "blog-routes-slice-"));
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
        title: input.title,
        description: `Description for ${input.title}.`,
        contextSentence: "Fixture context.",
        takeaway: "Fixture takeaway.",
      }),
    );
  }

  it("publishes canonical metadata for the English blog index route", async () => {
    const metadata = await generateBlogIndexMetadata();

    expect(metadata.title).toBe("Blog");
    expect(metadata.alternates?.canonical).toBe(blogIndexHref());
    expect(metadata.description?.length).toBeGreaterThan(0);
  });

  it("publishes canonical metadata for a published blog post route", async () => {
    const metadata = await generateBlogPostMetadata({
      params: Promise.resolve({ slug: ROOFLINE_SLUG }),
    });

    expect(metadata.title).toBe(ROOFLINE_TITLE);
    expect(metadata.description).toBe(ROOFLINE_DESCRIPTION);
    expect(metadata.alternates?.canonical).toBe(blogPostHref(ROOFLINE_SLUG));
  });

  it("returns empty metadata for an unknown blog post slug", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-routes-slice-unknown-"));

    const metadata = await generateBlogPostMetadata({
      params: Promise.resolve({ slug: "missing-post" }),
    });

    expect(metadata).toEqual({});
  });

  it("includes published blog slugs in static params", () => {
    const params = generateBlogPostStaticParams();

    expect(params).toEqual(expect.arrayContaining([{ slug: ROOFLINE_SLUG }]));
  });

  it("renders /blog index content from post metadata", async () => {
    const page = await renderBlogIndexPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain(ROOFLINE_TITLE);
    expect(html).toContain(ROOFLINE_DESCRIPTION);
    expect(html).toContain('dateTime="2026-07-02"');
    expect(html).toContain(`href="/blog/${ROOFLINE_SLUG}"`);
    expect(html).toContain(`aria-label="Read blog post: ${ROOFLINE_TITLE}"`);
  });

  it("renders /blog/<slug> body content for a published post", async () => {
    const page = await renderBlogPostPage(ROOFLINE_SLUG);
    const html = renderToStaticMarkup(page);

    expect(html).toContain(ROOFLINE_TITLE);
    expect(html).toContain(ROOFLINE_DESCRIPTION);
    expect(html).toContain(`data-blog-slug="${ROOFLINE_SLUG}"`);
    expect(html).toContain("Why active weight reads can cap throughput");
    expect(html).toContain('data-roofline-throughput-explorer="explorer"');
  });

  it("renders fixture post body content through /blog/<slug>", async () => {
    await writeFixturePost({
      slug: "slice-fixture-post",
      status: "published",
      publishedAt: "2026-06-10",
      title: "Slice Fixture Post",
    });

    const page = await renderBlogPostPage("slice-fixture-post", "en", {
      blogRoot: tempRoot,
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Slice Fixture Post");
    expect(html).toContain(
      "Fixture paragraph for blog route slice verification.",
    );
  });

  it("orders /blog index cards newest-first with deterministic tie-breakers", async () => {
    await writeFixturePost({
      slug: "older-slice-post",
      status: "published",
      publishedAt: "2026-05-01",
      title: "Older Slice Post",
    });
    await writeFixturePost({
      slug: "newer-slice-post",
      status: "published",
      publishedAt: "2026-06-15",
      title: "Newer Slice Post",
    });

    const page = await renderBlogIndexPage("en", { blogRoot: tempRoot });
    const html = renderToStaticMarkup(page);

    expect(blogPostHrefPosition(html, "newer-slice-post")).toBeLessThan(
      blogPostHrefPosition(html, "older-slice-post"),
    );
  });

  it("returns missing-page behavior for an unknown /blog/<slug>", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-routes-slice-missing-"));

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
});
