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
import { loadPublishedDocsPages } from "@/lib/content/pages";
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

const MARKDOWN_HEADING_PATTERN = /^#{1,6}\s+(.+)$/gm;
const SECTION_ID_PATTERN = /<Section[^>]*\sid=["']([^"']+)["']/g;

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
  for (const match of content.matchAll(MARKDOWN_HEADING_PATTERN)) {
    const title = match[1]?.trim();
    if (!title) {
      continue;
    }
    hashes.push(slugifyHeading(title));
  }
  return hashes;
}

/** Extracts `<Section id="...">` anchors from module and glossary MDX templates. */
export function extractSectionIdsFromMdx(content: string): string[] {
  const ids: string[] = [];
  for (const match of content.matchAll(SECTION_ID_PATTERN)) {
    const id = match[1]?.trim();
    if (id) {
      ids.push(id);
    }
  }
  return ids;
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

function routeMetaKeyFromUrl(url: string): string {
  return url.replace(/^\//, "");
}

async function readFumadocsLinkFiles(): Promise<FileObject[]> {
  const files: FileObject[] = [];

  for (const page of source.getPages()) {
    if (!page.absolutePath) {
      throw new Error(`Missing absolutePath for docs page at ${page.url}`);
    }

    files.push({
      path: page.absolutePath,
      content: await page.data.getText("raw"),
      url: page.url,
    });
  }

  return files;
}

async function readDedicatedDocsLinkFiles(): Promise<FileObject[]> {
  const pages = await loadPublishedDocsPages("en");
  return pages.map((page) => ({
    path: join(page.pageDir, "page.mdx"),
    content: readFileSync(join(page.pageDir, "page.mdx"), "utf8"),
    url: page.url,
  }));
}

/** Collects Fumadocs MDX plus module and glossary MDX served on dedicated routes. */
export async function collectDocumentationLinkFiles(): Promise<FileObject[]> {
  const fumadocsFiles = await readFumadocsLinkFiles();
  const dedicatedFiles = await readDedicatedDocsLinkFiles();
  const seenPaths = new Set<string>();

  return [...fumadocsFiles, ...dedicatedFiles].filter((file) => {
    if (seenPaths.has(file.path)) {
      return false;
    }
    seenPaths.add(file.path);
    return true;
  });
}

/** Builds the Next.js route scan used to resolve internal docs URLs and anchors. */
export async function buildDocumentationLinkScan(
  files: FileObject[],
): Promise<ScanResult> {
  const meta: Record<string, { hashes?: string[] }> = {};

  for (const file of files) {
    if (!file.url) {
      continue;
    }
    meta[routeMetaKeyFromUrl(file.url)] = {
      hashes: extractPageHeadingHashes(file.content),
    };
  }

  const fumadocsPopulate = source.getPages().map((page) => ({
    value: { slug: page.slugs },
    hashes: fileHeadingHashes(files, page.url),
  }));

  return scanURLs({
    preset: "next",
    meta,
    populate: {
      "docs/[[...slug]]": fumadocsPopulate,
    },
  });
}

function fileHeadingHashes(files: FileObject[], url: string): string[] {
  const file = files.find((candidate) => candidate.url === url);
  return file ? extractPageHeadingHashes(file.content) : [];
}

export type ValidateDocumentationLinksOptions = {
  files?: FileObject[];
  scanned?: ScanResult;
};

/** Validates internal documentation links across Fumadocs and dedicated docs routes. */
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
