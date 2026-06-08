import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { scanURLs } from "next-validate-link";
import {
  collectDocumentationLinkFiles,
  extractPageHeadingHashes,
  extractSectionAnchorsFromMdx,
  extractSectionIdsFromMdx,
  slugifyHeading,
  validateDocumentationLinks,
} from "@/lib/build/validate-links";

const repoRoot = join(import.meta.dir, "../../..");

describe("validate-links helpers", () => {
  test("slugifyHeading normalizes markdown heading text", () => {
    expect(slugifyHeading("Welcome")).toBe("welcome");
    expect(slugifyHeading("What It Is")).toBe("what-it-is");
  });

  test("extractSectionIdsFromMdx collects Section anchors", () => {
    const content = `
<Section id="what-it-is" titleKey="sections.whatItIs.title">
  Body
</Section>
<Section id="related" titleKey="sections.related.title">
  More
</Section>
`;

    expect(extractSectionIdsFromMdx(content)).toEqual([
      "what-it-is",
      "related",
    ]);
  });

  test("extractSectionAnchorsFromMdx preserves id and titleKey pairs", () => {
    const content = `
<Section titleKey="sections.whatItIs.title" id="what-it-is">
  Body
</Section>
`;

    expect(extractSectionAnchorsFromMdx(content)).toEqual([
      { id: "what-it-is", titleKey: "sections.whatItIs.title" },
    ]);
  });

  test("extractPageHeadingHashes merges markdown headings and section ids", () => {
    const content = `
## Reader Guide
<Section id="what-it-is" titleKey="sections.whatItIs.title">
  Body
</Section>
`;

    expect(extractPageHeadingHashes(content)).toEqual([
      "reader-guide",
      "what-it-is",
    ]);
  });
});

describe("validateDocumentationLinks", () => {
  test("passes on current repository documentation content", async () => {
    const results = await validateDocumentationLinks();
    expect(results).toEqual([]);
  });

  test("collectDocumentationLinkFiles includes catch-all-served glossary and module MDX once", async () => {
    const files = await collectDocumentationLinkFiles();
    const urls = files.map((file) => file.url).sort();
    const paths = files.map((file) => file.path);

    expect(urls).toContain("/docs/getting-started");
    expect(urls).toContain("/docs/modules/grouped-query-attention");
    expect(urls).toContain("/docs/glossary/token");
    expect(new Set(paths).size).toBe(paths.length);
    expect(files.length).toBeLessThan(55);
  });

  test("reports a broken internal route with an actionable target URL", async () => {
    const scanned = await scanURLs({
      preset: "next",
      populate: {
        "docs/[[...slug]]": [
          { value: { slug: ["getting-started"] }, hashes: ["welcome"] },
        ],
      },
    });

    const results = await validateDocumentationLinks({
      files: [
        {
          path: "fixture/page.mdx",
          content: "[Broken module](/docs/modules/does-not-exist)",
          url: "/docs/getting-started",
        },
      ],
      scanned,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.errors[0]?.url).toBe("/docs/modules/does-not-exist");
    expect(results[0]?.errors[0]?.reason).toBe("not-found");
  });

  test("reports invalid heading anchors on populated docs routes", async () => {
    const scanned = await scanURLs({
      preset: "next",
      populate: {
        "docs/[[...slug]]": [
          {
            value: { slug: ["modules", "grouped-query-attention"] },
            hashes: ["what-it-is"],
          },
        ],
      },
    });

    const results = await validateDocumentationLinks({
      files: [
        {
          path: "fixture/page.mdx",
          content:
            "[Missing section](/docs/modules/grouped-query-attention#missing-section)",
          url: "/docs/getting-started",
        },
      ],
      scanned,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.errors[0]?.url).toBe(
      "/docs/modules/grouped-query-attention#missing-section",
    );
    expect(results[0]?.errors[0]?.reason).toBe("invalid-fragment");
  });
});

describe("make linkcheck", () => {
  test("exits zero on current repository content", () => {
    const result = spawnSync("make", ["linkcheck"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Link validation passed.");
  });

  test("exits non-zero when validation helper detects a broken internal link", () => {
    const result = spawnSync(
      "bun",
      [
        "-e",
        `
import { scanURLs } from "next-validate-link";
import {
  reportDocumentationLinkValidation,
  validateDocumentationLinks,
} from "./src/lib/build/validate-links.ts";

const scanned = await scanURLs({
  preset: "next",
  populate: {
    "docs/[[...slug]]": [
      { value: { slug: ["getting-started"] }, hashes: ["welcome"] },
    ],
  },
});

const results = await validateDocumentationLinks({
  files: [
    {
      path: "fixture/page.mdx",
      content: "[Broken](/docs/modules/does-not-exist)",
      url: "/docs/getting-started",
    },
  ],
  scanned,
});

reportDocumentationLinkValidation(results);
`,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr ?? result.stdout).toContain(
      "/docs/modules/does-not-exist",
    );
  });
});
