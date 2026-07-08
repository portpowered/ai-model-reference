import { afterEach, describe, expect, it, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { TagResourceList } from "@/features/docs/components/TagResourceList";
import type { PublishedBlogPostRecord } from "@/lib/content/blog-post-list";
import {
  groupTagResourceEntriesByKind,
  loadTagResourceEntries,
  loadTagResourceGroups,
  publishedBlogPostMatchesTag,
  sortTagResourceEntriesForKind,
  toBlogTagResourceEntry,
} from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";

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

function fixturePostRecord(
  overrides: Partial<PublishedBlogPostRecord> & {
    slug: string;
  },
): PublishedBlogPostRecord {
  const { slug, frontmatter, messages, ...rest } = overrides;
  return {
    slug,
    sourcePath: `/tmp/${slug}/page.mdx`,
    frontmatter: {
      messageNamespace: "local",
      assetNamespace: "local",
      publishedAt: "2026-06-02",
      updatedAt: "2026-06-02",
      authors: ["site-team"],
      tags: ["kv-cache"],
      relatedDocIds: ["concept.prefill"],
      status: "published",
      ...frontmatter,
    },
    messages: {
      ...validMessages,
      ...messages,
    },
    assets: {},
    ...rest,
  };
}

describe("blog tag landing resources", () => {
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
  }) {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-tag-landing-"));
    const pageDir = join(tempRoot, input.slug);
    await mkdir(join(pageDir, "messages"), { recursive: true });
    await writeFile(
      join(pageDir, "page.mdx"),
      input.frontmatter ?? publishedFrontmatterBlock(),
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify(input.messages ?? validMessages),
    );

    return { blogRoot: tempRoot, slug: input.slug };
  }

  test("publishedBlogPostMatchesTag checks frontmatter tags only", () => {
    const post = fixturePostRecord({
      slug: "kv-cache-notes",
      frontmatter: {
        messageNamespace: "local",
        assetNamespace: "local",
        publishedAt: "2026-06-02",
        updatedAt: "2026-06-02",
        authors: ["site-team"],
        tags: ["kv-cache", "foundations"],
        relatedDocIds: ["concept.prefill"],
        status: "published",
      },
    });

    expect(publishedBlogPostMatchesTag(post, "kv-cache")).toBe(true);
    expect(publishedBlogPostMatchesTag(post, "attention")).toBe(false);
  });

  test("toBlogTagResourceEntry maps localized blog route metadata", () => {
    const entry = toBlogTagResourceEntry(
      fixturePostRecord({ slug: "kv-cache-notes" }),
      "en",
    );

    expect(entry).toMatchObject({
      title: validMessages.title,
      summary: validMessages.description,
      url: "/blog/kv-cache-notes",
      slug: "kv-cache-notes",
      kind: "blog",
      publishedAt: "2026-06-02",
      tags: ["kv-cache"],
    });
  });

  test("loadTagResourceGroups includes a distinct blog group for matching published posts", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "kv-cache-notes",
      frontmatter: publishedFrontmatterBlock({
        tags: ["kv-cache", "foundations"],
      }),
    });
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("kv-cache", messages, "en", {
      blogRoot,
    });
    const blogGroup = groups.find((group) => group.kind === "blog");

    expect(blogGroup).toBeDefined();
    expect(blogGroup?.kindLabel).toBe("Blog");
    expect(blogGroup?.resources).toEqual([
      expect.objectContaining({
        title: validMessages.title,
        summary: validMessages.description,
        url: "/blog/kv-cache-notes",
        publishedAt: "2026-06-02",
        tags: ["kv-cache", "foundations"],
      }),
    ]);
  });

  test("draft blog posts are excluded from tag landing membership", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "draft-kv-cache-notes",
      frontmatter: publishedFrontmatterBlock({
        status: "draft",
        tags: ["kv-cache"],
      }),
    });
    const entries = await loadTagResourceEntries("kv-cache", "en", {
      blogRoot,
    });

    expect(entries.some((entry) => entry.kind === "blog")).toBe(false);
  });

  test("omits the blog group when no published posts match the tag", async () => {
    const { blogRoot } = await writeFixturePost({
      slug: "foundations-only",
      frontmatter: publishedFrontmatterBlock({ tags: ["foundations"] }),
    });
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("attention", messages, "en", {
      blogRoot,
    });

    expect(groups.some((group) => group.kind === "blog")).toBe(false);
  });

  test("sorts blog resources by published date newest first", async () => {
    const messages = await loadUiMessages();
    const groups = groupTagResourceEntriesByKind(
      [
        toBlogTagResourceEntry(
          fixturePostRecord({
            slug: "older-post",
            frontmatter: {
              messageNamespace: "local",
              assetNamespace: "local",
              publishedAt: "2026-01-01",
              updatedAt: "2026-01-01",
              authors: ["site-team"],
              tags: ["kv-cache"],
              relatedDocIds: ["concept.prefill"],
              status: "published",
            },
            messages: { ...validMessages, title: "Older Post" },
          }),
        ),
        toBlogTagResourceEntry(
          fixturePostRecord({
            slug: "newer-post",
            frontmatter: {
              messageNamespace: "local",
              assetNamespace: "local",
              publishedAt: "2026-06-02",
              updatedAt: "2026-06-02",
              authors: ["site-team"],
              tags: ["kv-cache"],
              relatedDocIds: ["concept.prefill"],
              status: "published",
            },
            messages: { ...validMessages, title: "Newer Post" },
          }),
        ),
      ],
      messages,
    );

    expect(groups[0]?.resources.map((resource) => resource.title)).toEqual([
      "Newer Post",
      "Older Post",
    ]);
    expect(
      sortTagResourceEntriesForKind(
        groups[0]?.resources ?? [],
        "blog",
        "en",
      ).map((resource) => resource.title),
    ).toEqual(["Newer Post", "Older Post"]);
  });
});

describe("production blog tag landing", () => {
  it("lists evolution-of-diffusion on the model-family tag page", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("model-family", messages, "en");
    const blogGroup = groups.find((group) => group.kind === "blog");

    expect(blogGroup).toBeDefined();
    expect(blogGroup?.kindLabel).toBe("Blog");
    expect(blogGroup?.resources).toEqual([
      expect.objectContaining({
        title:
          "How diffusion generation evolved from pixel U-Nets to transformers, flow matching, and modern video models",
        url: "/blog/evolution-of-diffusion",
        publishedAt: "2026-07-08",
        tags: ["foundations", "model-family"],
      }),
    ]);
  });

  it("lists published blog posts on foundations and kv-cache tag pages", async () => {
    const messages = await loadUiMessages();
    const foundationsGroups = await loadTagResourceGroups(
      "foundations",
      messages,
      "en",
    );
    const foundationsBlogGroup = foundationsGroups.find(
      (group) => group.kind === "blog",
    );

    expect(foundationsBlogGroup).toBeDefined();
    expect(foundationsBlogGroup?.kindLabel).toBe("Blog");
    expect(foundationsBlogGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title:
            "How diffusion generation evolved from pixel U-Nets to transformers, flow matching, and modern video models",
          url: "/blog/evolution-of-diffusion",
          publishedAt: "2026-07-08",
        }),
        expect.objectContaining({
          title:
            "Roofline maximum throughput: when bandwidth beats peak FLOPs",
          url: "/blog/roofline-max-throughput",
          publishedAt: "2026-07-08",
        }),
        expect.objectContaining({
          title: "Why throughput follows a roofline",
          url: "/blog/roofline-throughput-explorer",
          publishedAt: "2026-07-02",
        }),
      ]),
    );

    const kvCacheGroups = await loadTagResourceGroups(
      "kv-cache",
      messages,
      "en",
    );
    const kvCacheBlogGroup = kvCacheGroups.find(
      (group) => group.kind === "blog",
    );

    expect(kvCacheBlogGroup).toBeDefined();
    expect(kvCacheBlogGroup?.kindLabel).toBe("Blog");
    expect(kvCacheBlogGroup?.resources).toEqual([
      expect.objectContaining({
        title:
          "Roofline maximum throughput: when bandwidth beats peak FLOPs",
        url: "/blog/roofline-max-throughput",
        publishedAt: "2026-07-08",
      }),
      expect.objectContaining({
        title: "Why throughput follows a roofline",
        url: "/blog/roofline-throughput-explorer",
        publishedAt: "2026-07-02",
      }),
    ]);

    expect(
      foundationsBlogGroup?.resources.map((resource) => resource.slug),
    ).toEqual([
      "evolution-of-diffusion",
      "roofline-max-throughput",
      "llm-training-shift",
      "roofline-throughput-explorer",
    ]);
  });

  it("keeps attention tag groups unchanged without a blog section", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("attention", messages, "en");

    expect(groups.map((group) => group.kind)).toEqual([
      "model",
      "module",
      "concept",
      "paper",
      "glossary",
    ]);
  });

  it("renders blog metadata on the foundations tag landing page", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "foundations" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Blog");
    expect(html).toContain(
      "How diffusion generation evolved from pixel U-Nets to transformers, flow matching, and modern video models",
    );
    expect(html).toContain('href="/blog/evolution-of-diffusion"');
    expect(html).toContain(
      "Roofline maximum throughput: when bandwidth beats peak FLOPs",
    );
    expect(html).toContain('href="/blog/roofline-max-throughput"');
    expect(html).toContain(
      "How memory bandwidth, compute FLOPs, precision, and active weight size jointly bound the maximum tokens per second a language model can achieve during serving.",
    );
    expect(html).toContain('dateTime="2026-07-08"');
    expect(html).toContain("Why throughput follows a roofline");
    expect(html).toContain('href="/blog/roofline-throughput-explorer"');
    expect(html).toContain(
      "An interactive roofline view of how memory bandwidth and active weight reads shape achievable model throughput.",
    );
    expect(html).toContain('dateTime="2026-07-02"');
    expect(html).toContain('href="/tags/kv-cache"');
  });

  it("renders roofline max throughput blog metadata on the kv-cache tag landing page", async () => {
    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "kv-cache" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Blog");
    expect(html).toContain(
      "Roofline maximum throughput: when bandwidth beats peak FLOPs",
    );
    expect(html).toContain('href="/blog/roofline-max-throughput"');
    expect(html).toContain('dateTime="2026-07-08"');
    expect(html).toContain("Why throughput follows a roofline");
    expect(html).toContain('href="/blog/roofline-throughput-explorer"');
  });
});

describe("TagResourceList blog presentation", () => {
  test("renders published date and supplemental tag pills for blog entries", () => {
    const html = renderToStaticMarkup(
      createElement(TagResourceList, {
        groups: [
          {
            kind: "blog",
            kindLabel: "Blog",
            resources: [
              {
                title: "KV Cache Serving Notes",
                summary: "How KV cache reuse shapes decode throughput.",
                url: "/blog/kv-cache-notes",
                slug: "kv-cache-notes",
                kind: "blog",
                publishedAt: "2026-06-02",
                tags: ["kv-cache", "foundations"],
              },
            ],
          },
        ],
        listLabel: "Resources",
        tagSlug: "kv-cache",
      }),
    );

    expect(html).toContain('dateTime="2026-06-02"');
    expect(html).toContain("June 2026");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).not.toContain('href="/tags/kv-cache"');
  });
});
