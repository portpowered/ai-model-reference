import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { buildSearchDocument } from "@/lib/search/build-documents";
import { collectMessageBodyText } from "./messages";
import { getMessageString } from "./page-messages-load";
import { deriveDefaultSummaryKey, deriveDefaultTitleKey } from "./page-spec";
import type { RegistryIndexes } from "./registry";
import { loadRegistry } from "./registry";
import {
  type GeneratedPageBundleRegistryRecord,
  generatedPageBundleRegistryRecordSchema,
  type PageFrontmatter,
  type PageKind,
  type PageMessages,
  pageFrontmatterSchema,
} from "./schemas";
import { validateCanonicalMdxProse } from "./validate-canonical-mdx-prose";
import {
  type ValidationError,
  validateColocatedPageBundle,
  validateRegistryContent,
} from "./validate-registry";
import { parseYamlFrontmatterBlock } from "./yaml-frontmatter";

const pageKindRegistryKindAliases: Partial<
  Record<PageKind, GeneratedPageBundleRegistryRecord["kind"]>
> = {
  glossary: "concept",
};

function pageKindMatchesRegistryRecord(
  pageKind: PageKind,
  registryKind: GeneratedPageBundleRegistryRecord["kind"],
): boolean {
  return (
    pageKind === registryKind ||
    pageKindRegistryKindAliases[pageKind] === registryKind
  );
}

function pageDirectorySlug(pageDirectory: string): string {
  return basename(pageDirectory);
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function parseGeneratedRegistryRecord(
  raw: unknown,
): GeneratedPageBundleRegistryRecord {
  return generatedPageBundleRegistryRecordSchema.parse(raw);
}

export function validateRegistryFrontmatterAlignment(
  registryRecord: GeneratedPageBundleRegistryRecord,
  frontmatter: PageFrontmatter,
  messages: PageMessages,
  pageDirectory: string,
  frontmatterRaw?: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const pagePath = join(pageDirectory, "page.mdx");

  if (registryRecord.id !== frontmatter.registryId) {
    errors.push({
      code: "registry-frontmatter-mismatch",
      message: `${pagePath}: registry id "${registryRecord.id}" does not match frontmatter registryId "${frontmatter.registryId}"`,
      path: pagePath,
    });
  }

  if (!pageKindMatchesRegistryRecord(frontmatter.kind, registryRecord.kind)) {
    errors.push({
      code: "kind-mismatch",
      message: `${pagePath}: frontmatter kind "${frontmatter.kind}" does not match registry kind "${registryRecord.kind}"`,
      path: pagePath,
    });
  }

  const pageSlug = pageDirectorySlug(pageDirectory);
  if (pageSlug !== registryRecord.slug) {
    errors.push({
      code: "page-slug-mismatch",
      message: `${pagePath}: page directory slug "${pageSlug}" does not match registry slug "${registryRecord.slug}"`,
      path: pagePath,
    });
  }

  if (registryRecord.defaultTitleKey !== deriveDefaultTitleKey()) {
    errors.push({
      code: "default-title-key-mismatch",
      message: `${registryRecord.id}: defaultTitleKey must be "${deriveDefaultTitleKey()}"`,
      path: pagePath,
    });
  }

  if (registryRecord.defaultSummaryKey !== deriveDefaultSummaryKey()) {
    errors.push({
      code: "default-summary-key-mismatch",
      message: `${registryRecord.id}: defaultSummaryKey must be "${deriveDefaultSummaryKey()}"`,
      path: pagePath,
    });
  }

  const resolvedTitle = getMessageString(
    messages,
    registryRecord.defaultTitleKey,
  );
  if (resolvedTitle !== messages.title) {
    errors.push({
      code: "default-title-key-unresolved",
      message: `${pagePath}: defaultTitleKey "${registryRecord.defaultTitleKey}" does not resolve to messages.title`,
      path: join(pageDirectory, "messages", "en.json"),
    });
  }

  const resolvedSummary = getMessageString(
    messages,
    registryRecord.defaultSummaryKey,
  );
  if (resolvedSummary !== messages.description) {
    errors.push({
      code: "default-summary-key-unresolved",
      message: `${pagePath}: defaultSummaryKey "${registryRecord.defaultSummaryKey}" does not resolve to messages.description`,
      path: join(pageDirectory, "messages", "en.json"),
    });
  }

  if (!arraysEqual(frontmatter.tags, registryRecord.tags)) {
    errors.push({
      code: "tags-mismatch",
      message: `${pagePath}: frontmatter tags do not match registry tags`,
      path: pagePath,
    });
  }

  if (frontmatter.status !== registryRecord.status) {
    errors.push({
      code: "status-mismatch",
      message: `${pagePath}: frontmatter status "${frontmatter.status}" does not match registry status "${registryRecord.status}"`,
      path: pagePath,
    });
  }

  if (!registryRecord.updatedAt.startsWith(frontmatter.updatedAt)) {
    errors.push({
      code: "updated-at-mismatch",
      message: `${pagePath}: frontmatter updatedAt "${frontmatter.updatedAt}" does not match registry updatedAt "${registryRecord.updatedAt}"`,
      path: pagePath,
    });
  }

  const frontmatterAliases = frontmatter.aliases ?? [];
  if (!arraysEqual(frontmatterAliases, registryRecord.aliases)) {
    errors.push({
      code: "aliases-mismatch",
      message: `${pagePath}: frontmatter aliases do not match registry aliases`,
      path: pagePath,
    });
  }

  if (frontmatter.kind === "glossary" && frontmatterRaw) {
    const glossaryTitle = frontmatterRaw.title;
    const glossaryDescription = frontmatterRaw.description;
    if (typeof glossaryTitle === "string" && glossaryTitle !== messages.title) {
      errors.push({
        code: "glossary-title-mismatch",
        message: `${pagePath}: glossary frontmatter title does not match messages.title`,
        path: pagePath,
      });
    }
    if (
      typeof glossaryDescription === "string" &&
      glossaryDescription !== messages.description
    ) {
      errors.push({
        code: "glossary-description-mismatch",
        message: `${pagePath}: glossary frontmatter description does not match messages.description`,
        path: pagePath,
      });
    }
  }

  return errors;
}

export function validateGeneratedSearchText(
  messages: PageMessages,
  frontmatter: PageFrontmatter,
  pageUrl: string,
  indexes: RegistryIndexes,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const pagePath = pageUrl;

  const docsPage = {
    pageDir: "",
    docsSlug: pageUrl.replace(/^\/docs\//, ""),
    url: pageUrl,
    frontmatter,
    messages,
  };

  const searchDocument = buildSearchDocument(docsPage, indexes);
  if (searchDocument.title !== messages.title) {
    errors.push({
      code: "search-title-not-from-messages",
      message: `${pagePath}: search title must come from resolved messages.title`,
    });
  }

  if (searchDocument.description !== messages.description) {
    errors.push({
      code: "search-description-not-from-messages",
      message: `${pagePath}: search description must come from resolved messages.description`,
    });
  }

  const expectedBodyText = collectMessageBodyText(messages);
  if (searchDocument.bodyText !== expectedBodyText) {
    errors.push({
      code: "search-body-not-from-messages",
      message: `${pagePath}: search bodyText must come from resolved messages, not MDX`,
    });
  }

  return errors;
}

export type ValidateGeneratedPageBundleOptions = {
  registryRoot: string;
  docsRoot: string;
  pageDirectory: string;
  registryPath: string;
  pageUrl: string;
  indexes?: RegistryIndexes;
};

export async function validateGeneratedPageBundle(
  options: ValidateGeneratedPageBundleOptions,
): Promise<ValidationError[]> {
  const {
    registryRoot,
    pageDirectory,
    registryPath,
    pageUrl,
    indexes: providedIndexes,
  } = options;
  const errors: ValidationError[] = [];
  const pagePath = join(pageDirectory, "page.mdx");

  let registryRecord: GeneratedPageBundleRegistryRecord;
  try {
    const raw = JSON.parse(await readFile(registryPath, "utf8")) as unknown;
    registryRecord = parseGeneratedRegistryRecord(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      code: "invalid-registry-record",
      message: `${registryPath}: ${message}`,
      path: registryPath,
    });
    return errors;
  }

  const mdxSource = await readFile(pagePath, "utf8");
  const frontmatterMatch = mdxSource.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch?.[1]) {
    errors.push({
      code: "missing-frontmatter",
      message: `${pagePath}: missing YAML frontmatter block`,
      path: pagePath,
    });
    return errors;
  }

  const frontmatterRaw = parseYamlFrontmatterBlock(frontmatterMatch[1]);
  const frontmatterResult = pageFrontmatterSchema.safeParse(frontmatterRaw);
  if (!frontmatterResult.success) {
    const message = frontmatterResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    errors.push({
      code: "invalid-frontmatter",
      message: `${pagePath}: invalid frontmatter — ${message}`,
      path: pagePath,
    });
    return errors;
  }

  const bundle = await validateColocatedPageBundle(
    pageDirectory,
    providedIndexes,
  );
  errors.push(...bundle.errors);
  if (!bundle.messages) {
    return errors;
  }

  const messages = bundle.messages;
  errors.push(
    ...validateRegistryFrontmatterAlignment(
      registryRecord,
      frontmatterResult.data,
      messages,
      pageDirectory,
      frontmatterRaw,
    ),
  );

  const indexes =
    providedIndexes ??
    (await loadRegistry({
      registryRoot,
    }));

  errors.push(
    ...validateGeneratedSearchText(
      messages,
      frontmatterResult.data,
      pageUrl,
      indexes,
    ),
  );

  const assets = bundle.assets;
  if (assets) {
    errors.push(
      ...validateCanonicalMdxProse({
        pagePath,
        kind: frontmatterResult.data.kind,
        mdxSource,
        messages,
        assets,
      }),
    );
  }

  return errors;
}

export async function validateGeneratedPageBundleRegistryContent(options: {
  registryRoot: string;
  docsRoot: string;
}): Promise<ValidationError[]> {
  return validateRegistryContent({
    registryRoot: options.registryRoot,
    docsRoot: options.docsRoot,
    phase1PageDirectories: [],
  });
}
