import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PageAssetConfig, PageMessages } from "./schemas";
import {
  isBlogContentPath,
  shouldValidateCanonicalMdxProse,
  splitMdxFrontmatter,
  validateCanonicalMdxProse,
} from "./validate-canonical-mdx-prose";

const canonicalConceptMdx = readFileSync(
  join(process.cwd(), "docs/templates/concept.mdx"),
  "utf8",
);

const blogPostMdx = readFileSync(
  join(process.cwd(), "docs/templates/blog-post.mdx"),
  "utf8",
);

const sampleMessages: PageMessages = {
  title: "Generated Page",
  description: "Reader-facing summary for cards and search.",
  openingSummary: "Folded opening summary for the page hero.",
  sections: {
    whatItIs: {
      title: "What It Is",
      body: "Glossary body from page spec with enough length to detect leaks.",
    },
  },
  callouts: {
    note: {
      title: "Reference context callout title",
      body: "Callout body that should never appear inside MDX prose checks.",
    },
  },
};

const sampleAssets: PageAssetConfig = {
  conceptMap: {
    type: "graph",
    graphId: "graph.example-concept-map",
    webRenderer: "react-flow",
    printRenderer: "mermaid",
    altKey: "assets.conceptMap.alt",
  },
};

describe("validateCanonicalMdxProse", () => {
  test("passes structural concept template MDX with message keys only", () => {
    const errors = validateCanonicalMdxProse({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource: canonicalConceptMdx,
      messages: sampleMessages,
      assets: sampleAssets,
    });
    expect(errors).toEqual([]);
  });

  test("skips blog-post MDX even when it contains narrative prose", () => {
    expect(isBlogContentPath("/blog/example")).toBe(true);
    expect(isBlogContentPath("src/content/blog/example/page.mdx")).toBe(true);
    expect(
      shouldValidateCanonicalMdxProse({
        pagePath: "src/content/blog/example/page.mdx",
        kind: undefined,
      }),
    ).toBe(false);

    const errors = validateCanonicalMdxProse({
      pagePath: "src/content/blog/example/page.mdx",
      kind: undefined,
      mdxSource: blogPostMdx,
    });
    expect(errors).toEqual([]);
  });

  test("fails markdown headings with nearby line evidence", () => {
    const { frontmatter } = splitMdxFrontmatter(canonicalConceptMdx);
    const mdx = `---\n${frontmatter ?? ""}\n---\n\n## Hard-coded section heading\n\n<T k="openingSummary" />\n`;

    const errors = validateCanonicalMdxProse({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource: mdx,
    });

    expect(
      errors.some((error) => error.code === "mdx-hard-coded-heading"),
    ).toBe(true);
    expect(errors[0]?.message).toContain("near:");
    expect(errors[0]?.message).toContain("Hard-coded section heading");
  });

  test("fails hard-coded callout titles and paragraph prose", () => {
    const frontmatter = canonicalConceptMdx.match(/^---[\s\S]*?---/)?.[0] ?? "";
    const mdxSource = `${frontmatter}

<T k="openingSummary" />

<Callout type="note" title="Do not hard-code this title">
  This paragraph belongs in messages, not in canonical MDX source files.
</Callout>
`;

    const errors = validateCanonicalMdxProse({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource,
      messages: sampleMessages,
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some(
        (error) =>
          error.code === "mdx-hard-coded-attribute" ||
          error.code === "mdx-hard-coded-prose",
      ),
    ).toBe(true);
  });

  test("fails when resolved message prose is copied into MDX", () => {
    const frontmatter = canonicalConceptMdx.match(/^---[\s\S]*?---/)?.[0] ?? "";
    const leaked = sampleMessages.openingSummary ?? "";
    const mdxSource = `${frontmatter}

<T k="openingSummary" />

<p>${leaked}</p>
`;

    const errors = validateCanonicalMdxProse({
      pagePath: "/docs/concepts/example/page.mdx",
      kind: "concept",
      mdxSource,
      messages: sampleMessages,
    });

    expect(errors.some((error) => error.code === "mdx-hard-coded-prose")).toBe(
      true,
    );
    expect(
      errors.some((error) => error.message.includes("messages/en.json")),
    ).toBe(true);
  });

  test("fails hard-coded image alt text attributes", () => {
    const frontmatter = canonicalConceptMdx.match(/^---[\s\S]*?---/)?.[0] ?? "";
    const mdxSource = `${frontmatter}

<T k="openingSummary" />

<img src="/example.png" alt="Diagram showing attention flow across tokens" />
`;

    const errors = validateCanonicalMdxProse({
      pagePath: "/docs/modules/example/page.mdx",
      kind: "module",
      mdxSource,
    });

    expect(
      errors.some((error) => error.code === "mdx-hard-coded-attribute"),
    ).toBe(true);
    expect(errors[0]?.message).toContain("alt must use a message key");
  });
});
