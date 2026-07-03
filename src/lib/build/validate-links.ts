import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type FileObject,
  printErrors,
  type ScanResult,
  scanURLs,
  type ValidateResult,
  validateFiles,
} from "next-validate-link";
import {
  isBlogPostPubliclyVisible,
  parseBlogPostFrontmatter,
} from "@/lib/content/blog-frontmatter";
import { discoverBlogPostSlugs } from "@/lib/content/blog-post-list";
import { BLOG_ROOT } from "@/lib/content/content-paths";
import type { RegistryIndexes } from "@/lib/content/registry";
import { parseYamlFrontmatterBlock } from "@/lib/content/yaml-frontmatter";
import { source } from "@/lib/source";

/** MDX components whose `href` props are checked by next-validate-link. */
export const LINK_VALIDATION_MARKDOWN_COMPONENTS: Record<
  string,
  { attributes: string[] }
> = {
  Card: { attributes: ["href"] },
  Cards: { attributes: ["href"] },
  Callout: { attributes: ["href"] },
  SourceLink: { attributes: ["href"] },
  RelatedLink: { attributes: ["href"] },
};

export type SectionAnchor = {
  id: string;
  titleKey: string;
};

type LinkReadablePageData = {
  getText(format: "raw"): Promise<string>;
};

/** Slugifies a markdown heading for same-page anchor validation. */
export function slugifyHeading(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Extracts markdown heading hashes from raw MDX or markdown content. */
export function extractMarkdownHeadingHashes(content: string): string[] {
  const hashes: string[] = [];
  const markdownHeadingPattern = /^#{1,6}\s+(.+)$/gm;
  for (const match of content.matchAll(markdownHeadingPattern)) {
    const title = match[1]?.trim();
    if (!title) {
      continue;
    }
    hashes.push(slugifyHeading(title));
  }
  return hashes;
}

function parseSectionTagAttributes(attributes: string): {
  id?: string;
  titleKey?: string;
} {
  const id = attributes.match(/\sid=["']([^"']+)["']/)?.[1]?.trim();
  const titleKey = attributes.match(/\stitleKey=["']([^"']+)["']/)?.[1]?.trim();
  return { id, titleKey };
}

/** Extracts `<Section id="..." titleKey="...">` anchors in document order. */
export function extractSectionAnchorsFromMdx(content: string): SectionAnchor[] {
  const anchors: SectionAnchor[] = [];
  const sectionTagPattern = /<Section\b([^>]*)\/?>/g;

  for (const match of content.matchAll(sectionTagPattern)) {
    const { id, titleKey } = parseSectionTagAttributes(match[1] ?? "");
    if (id && titleKey) {
      anchors.push({ id, titleKey });
    }
  }

  return anchors;
}

/** Extracts `<Section id="...">` anchors from module and glossary MDX templates. */
export function extractSectionIdsFromMdx(content: string): string[] {
  return extractSectionAnchorsFromMdx(content).map((anchor) => anchor.id);
}

/** Combines markdown headings and explicit section ids for a docs page. */
export function extractPageHeadingHashes(content: string): string[] {
  return [
    ...new Set([
      ...extractMarkdownHeadingHashes(content),
      ...extractSectionIdsFromMdx(content),
    ]),
  ];
}

async function readFumadocsLinkFiles(): Promise<FileObject[]> {
  const files: FileObject[] = [];

  for (const page of source.getPages()) {
    if (!page.absolutePath) {
      throw new Error(`Missing absolutePath for docs page at ${page.url}`);
    }
    const pageData = page.data as typeof page.data & LinkReadablePageData;

    files.push({
      path: page.absolutePath,
      content: await pageData.getText("raw"),
      url: page.url,
    });
  }

  return files;
}

/** Collects MDX from the Fumadocs docs source, including glossary and module pages served via catch-all. */
export async function collectDocumentationLinkFiles(): Promise<FileObject[]> {
  const files = await readFumadocsLinkFiles();
  const seenPaths = new Set<string>();

  return files.filter((file) => {
    if (seenPaths.has(file.path)) {
      return false;
    }
    seenPaths.add(file.path);
    return true;
  });
}

/** Builds the catch-all docs route scan used to resolve internal glossary, module, and root docs URLs. */
export async function buildDocumentationLinkScan(
  files: FileObject[],
): Promise<ScanResult> {
  const catchAllPopulate = source.getPages().map((page) => ({
    value: { slug: page.slugs },
    hashes: fileHeadingHashes(files, page.url),
  }));

  return scanURLs({
    preset: "next",
    populate: {
      "docs/[[...slug]]": catchAllPopulate,
    },
  });
}

function fileHeadingHashes(files: FileObject[], url: string): string[] {
  const file = files.find((candidate) => candidate.url === url);
  return file ? extractPageHeadingHashes(file.content) : [];
}

/** Extracts `assetId="..."` references from MDX component tags. */
export function extractMdxAssetIds(mdxBody: string): string[] {
  const pattern = /\bassetId="([^"]+)"/g;
  const values: string[] = [];
  for (const match of mdxBody.matchAll(pattern)) {
    if (match[1]) {
      values.push(match[1]);
    }
  }
  return values;
}

function splitBlogPostSource(source: string):
  | {
      frontmatterYaml: string;
      mdxBody: string;
    }
  | undefined {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match?.[1]) {
    return undefined;
  }

  return {
    frontmatterYaml: match[1],
    mdxBody: match[2] ?? "",
  };
}

function blogPostLinkFile(
  slug: string,
  mdxPath: string,
  source: string,
): FileObject {
  return {
    path: mdxPath,
    content: source,
    url: `/blog/${slug}`,
  };
}

export type BuildBlogPostLinkScanOptions = {
  blogRoot?: string;
  docsFiles?: FileObject[];
  indexes: RegistryIndexes;
};

/**
 * Builds a strict internal URL scan for blog MDX link validation.
 * Docs, published tag, and published blog routes are enumerated explicitly so
 * unknown targets fail instead of matching permissive Next route fallbacks.
 */
export async function buildBlogPostLinkScan(
  options: BuildBlogPostLinkScanOptions,
): Promise<ScanResult> {
  const blogRoot = options.blogRoot ?? BLOG_ROOT;
  const docsFiles =
    options.docsFiles ?? (await collectDocumentationLinkFiles());
  const docsScanned = await buildDocumentationLinkScan(docsFiles);
  const urls = new Map<string, { hashes?: string[] }>(docsScanned.urls);

  for (const tag of options.indexes.tagsBySlug.values()) {
    if (tag.status === "published") {
      urls.set(`/tags/${tag.slug}`, {});
    }
  }

  for (const slug of discoverBlogPostSlugs(blogRoot)) {
    const mdxPath = join(blogRoot, slug, "page.mdx");
    const source = readFileSync(mdxPath, "utf8");
    const split = splitBlogPostSource(source);
    if (!split) {
      continue;
    }

    const frontmatter = parseBlogPostFrontmatter(
      parseYamlFrontmatterBlock(split.frontmatterYaml),
    );
    if (!frontmatter.success || !isBlogPostPubliclyVisible(frontmatter.data)) {
      continue;
    }

    urls.set(`/blog/${slug}`, {
      hashes: extractPageHeadingHashes(split.mdxBody),
    });
  }

  return {
    urls,
    fallbackUrls: [],
  };
}

export type CollectPublishedBlogLinkFilesOptions = {
  blogRoot?: string;
};

/** Collects published blog MDX files for reader-visible link validation. */
export function collectPublishedBlogLinkFiles(
  options: CollectPublishedBlogLinkFilesOptions = {},
): FileObject[] {
  const blogRoot = options.blogRoot ?? BLOG_ROOT;
  const files: FileObject[] = [];

  for (const slug of discoverBlogPostSlugs(blogRoot)) {
    const mdxPath = join(blogRoot, slug, "page.mdx");
    const source = readFileSync(mdxPath, "utf8");
    const split = splitBlogPostSource(source);
    if (!split) {
      continue;
    }

    const frontmatter = parseBlogPostFrontmatter(
      parseYamlFrontmatterBlock(split.frontmatterYaml),
    );
    if (!frontmatter.success || !isBlogPostPubliclyVisible(frontmatter.data)) {
      continue;
    }

    files.push(blogPostLinkFile(slug, mdxPath, source));
  }

  return files;
}

export type ValidateBlogPostLinksOptions = {
  blogRoot?: string;
  docsFiles?: FileObject[];
  files?: FileObject[];
  indexes: RegistryIndexes;
  scanned?: ScanResult;
};

/** Validates reader-visible links in published blog MDX files. */
export async function validateBlogPostLinks(
  options: ValidateBlogPostLinksOptions,
): Promise<ValidateResult[]> {
  const files =
    options.files ??
    collectPublishedBlogLinkFiles({ blogRoot: options.blogRoot });
  const scanned =
    options.scanned ??
    (await buildBlogPostLinkScan({
      blogRoot: options.blogRoot,
      docsFiles: options.docsFiles,
      indexes: options.indexes,
    }));

  const results: ValidateResult[] = [];

  for (const file of files) {
    const pageDirectory = join(file.path, "..");
    const fileResults = await validateFiles([file], {
      scanned,
      baseDir: pageDirectory,
      checkRelativePaths: "exists",
      markdown: {
        components: LINK_VALIDATION_MARKDOWN_COMPONENTS,
      },
    });
    results.push(...fileResults);
  }

  return results;
}

export function formatLinkValidationReason(
  reason: ValidateResult["errors"][number]["reason"],
): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  return reason;
}

export type ValidateDocumentationLinksOptions = {
  files?: FileObject[];
  scanned?: ScanResult;
};

/** Validates internal documentation links for catch-all-served Fumadocs MDX pages. */
export async function validateDocumentationLinks(
  options: ValidateDocumentationLinksOptions = {},
): Promise<ValidateResult[]> {
  const files = options.files ?? (await collectDocumentationLinkFiles());
  const scanned = options.scanned ?? (await buildDocumentationLinkScan(files));

  return validateFiles(files, {
    scanned,
    checkRelativePaths: "as-url",
    markdown: {
      components: LINK_VALIDATION_MARKDOWN_COMPONENTS,
    },
  });
}

/** Prints validation results and exits the process with status 1 when links are broken. */
export function reportDocumentationLinkValidation(
  results: ValidateResult[],
): void {
  if (results.length === 0) {
    console.log("Link validation passed.");
    return;
  }

  printErrors(results, true);
}
