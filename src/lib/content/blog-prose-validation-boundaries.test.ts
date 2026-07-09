import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRegistry } from "./registry";
import { validatePublishedBlogPosts } from "./validate-blog-posts";
import {
  isBlogContentPath,
  isCanonicalMdxProseErrorCode,
  shouldValidateCanonicalMdxProse,
  validateCanonicalMdxProse,
} from "./validate-canonical-mdx-prose";
import { validateGeneratedCanonicalDocs } from "./validate-generated-canonical-docs";
import { validateRegistryContent } from "./validate-registry";

const canonicalConceptMdx = readFileSync(
  join(process.cwd(), "docs/templates/concept.mdx"),
  "utf8",
);

const canonicalMdxProseCodes = [
  "mdx-hard-coded-heading",
  "mdx-hard-coded-attribute",
  "mdx-hard-coded-prose",
] as const;

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
  lines.push("---");

  return lines.join("\n");
}

function narrativeBlogMdxBody(): string {
  return `

# <T k="title" />

<T k="contextSentence" />

## Serving throughput and memory bandwidth

When the memory subsystem cannot supply bytes fast enough, compute sits idle and throughput stops growing even if the accelerator has spare FLOPs.

The roofline view plots achievable decode throughput against memory bandwidth. Larger active weight reads lower achievable throughput because each forward pass must move more bytes.

<Callout type="note" title="Reader takeaway">
Blog posts may keep narrative prose, callout titles, and section headings directly in MDX.
</Callout>
`;
}

describe("blog prose validation boundaries", () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  async function writeNarrativeBlogFixture(slug: string) {
    tempRoot = await mkdtemp(join(tmpdir(), "blog-prose-boundaries-"));
    const pageDir = join(tempRoot, slug);
    await mkdir(join(pageDir, "messages"), { recursive: true });
    await writeFile(
      join(pageDir, "page.mdx"),
      `${publishedFrontmatterBlock()}${narrativeBlogMdxBody()}`,
    );
    await writeFile(
      join(pageDir, "messages", "en.json"),
      JSON.stringify({
        title: "Narrative Blog Fixture",
        description: "Fixture proving blog narrative prose stays allowed.",
        contextSentence:
          "This sentence lives in messages while body prose stays in MDX.",
        takeaway:
          "Readers can browse narrative explainers without prose migration.",
      }),
    );
    await writeFile(join(pageDir, "assets.json"), "{}");

    return { blogRoot: tempRoot, slug };
  }

  test("identifies blog routes and content paths outside canonical prose validation", () => {
    expect(isBlogContentPath("/blog/roofline-throughput-explorer")).toBe(true);
    expect(
      isBlogContentPath(
        "src/content/blog/roofline-throughput-explorer/page.mdx",
      ),
    ).toBe(true);
    expect(
      shouldValidateCanonicalMdxProse({
        pagePath: "src/content/blog/example/page.mdx",
        kind: undefined,
      }),
    ).toBe(false);
    expect(
      shouldValidateCanonicalMdxProse({
        pagePath: "/docs/concepts/example/page.mdx",
        kind: "concept",
      }),
    ).toBe(true);
  });

  test("published blog fixtures with narrative MDX prose pass blog validation", async () => {
    const { blogRoot } = await writeNarrativeBlogFixture("narrative-post");
    const indexes = await loadRegistry();

    const errors = await validatePublishedBlogPosts({ blogRoot, indexes });

    expect(errors).toEqual([]);
    expect(
      errors.some((error) => isCanonicalMdxProseErrorCode(error.code)),
    ).toBe(false);
  });

  test(
    "published blog fixtures with narrative MDX prose pass validateRegistryContent",
    async () => {
      const { blogRoot } = await writeNarrativeBlogFixture(
        "registry-narrative-post",
      );

      const errors = await validateRegistryContent({ blogRoot });
      const blogErrors = errors.filter((error) =>
        error.message.includes("/blog/registry-narrative-post"),
      );

      expect(blogErrors).toEqual([]);
      expect(
        errors.some((error) => isCanonicalMdxProseErrorCode(error.code)),
      ).toBe(false);
    },
    20_000,
  );

  test("canonical docs fixtures with raw user-visible prose still fail prose validation", () => {
    const frontmatter = canonicalConceptMdx.match(/^---[\s\S]*?---/)?.[0] ?? "";
    const mdxSource = `${frontmatter}

<T k="openingSummary" />

## Hard-coded section heading

This paragraph belongs in messages, not in canonical MDX source files for docs pages.
`;

    const proseErrors = validateCanonicalMdxProse({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource,
      messages: {
        title: "Example",
        description: "Summary",
      },
    });

    expect(
      proseErrors.some((error) =>
        canonicalMdxProseCodes.includes(
          error.code as (typeof canonicalMdxProseCodes)[number],
        ),
      ),
    ).toBe(true);

    const generatedErrors = validateGeneratedCanonicalDocs({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource,
      messages: {
        title: "Example",
        description: "Summary",
      },
      assets: {},
    });

    expect(
      generatedErrors.some((error) =>
        canonicalMdxProseCodes.includes(
          error.code as (typeof canonicalMdxProseCodes)[number],
        ),
      ),
    ).toBe(true);
  });

  test(
    "blog validation errors focus on metadata and references, not body prose",
    async () => {
      tempRoot = await mkdtemp(join(tmpdir(), "blog-prose-boundaries-"));
      const slug = "broken-metadata";
      const pageDir = join(tempRoot, slug);
      await mkdir(join(pageDir, "messages"), { recursive: true });
      await writeFile(
        join(pageDir, "page.mdx"),
        `${publishedFrontmatterBlock({
          tags: ["missing-tag"],
          relatedDocIds: ["concept.missing-target"],
        })}${narrativeBlogMdxBody()}`,
      );
      await writeFile(
        join(pageDir, "messages", "en.json"),
        JSON.stringify({
          title: "Broken metadata blog",
          description: "Fixture for metadata-focused validation errors.",
          contextSentence:
            "Metadata should fail while narrative prose stays allowed.",
          takeaway: "Tags and related docs must still resolve.",
        }),
      );
      await writeFile(join(pageDir, "assets.json"), "{}");

      const indexes = await loadRegistry();
      const errors = await validatePublishedBlogPosts({
        blogRoot: tempRoot,
        indexes,
      });

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.code === "unresolved-blog-tag")).toBe(
        true,
      );
      expect(
        errors.some((error) => error.code === "unresolved-blog-related-doc"),
      ).toBe(true);
      expect(
        errors.some((error) => isCanonicalMdxProseErrorCode(error.code)),
      ).toBe(false);
    },
    20_000,
  );

  test(
    "committed roofline blog post stays free of canonical prose validation errors",
    async () => {
      const errors = await validateRegistryContent();
      const blogErrors = errors.filter((error) =>
        error.message.includes("/blog/roofline-throughput-explorer"),
      );

      expect(blogErrors).toEqual([]);
      expect(
        errors.some((error) => isCanonicalMdxProseErrorCode(error.code)),
      ).toBe(false);
    },
    20_000,
  );
});
