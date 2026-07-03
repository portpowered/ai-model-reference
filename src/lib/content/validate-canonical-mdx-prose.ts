import { assetMessageKeys } from "./page-assets-load";
import { getMessageString } from "./page-messages-load";
import type { PageAssetConfig, PageKind, PageMessages } from "./schemas";
import type { ValidationError } from "./validate-registry";

/** Page kinds that must keep reader-facing text in messages/assets, not MDX. */
export const canonicalDocsPageKinds = new Set<PageKind>([
  "concept",
  "glossary",
  "module",
  "model",
  "paper",
  "training-regime",
  "system",
]);

const MIN_LEAKED_PROSE_LENGTH = 24;

const disallowedReaderFacingAttributes = [
  "alt",
  "caption",
  "label",
  "title",
] as const;

const allowedMessageKeyPattern = /^[a-z][a-zA-Z0-9.]*$/;

export function isCanonicalDocsPageKind(
  kind: PageKind | undefined,
): kind is PageKind {
  return kind !== undefined && canonicalDocsPageKinds.has(kind);
}

/** Blog routes and content paths stay outside canonical docs prose rules. */
export function isBlogContentPath(pagePath: string): boolean {
  const normalized = pagePath.replace(/\\/g, "/");
  return (
    normalized.includes("/blog/") ||
    normalized.endsWith("/blog") ||
    normalized.startsWith("/blog/")
  );
}

const canonicalMdxProseErrorCodes = new Set([
  "mdx-hard-coded-heading",
  "mdx-hard-coded-attribute",
  "mdx-hard-coded-prose",
]);

export function isCanonicalMdxProseErrorCode(code: string): boolean {
  return canonicalMdxProseErrorCodes.has(code);
}

export function shouldValidateCanonicalMdxProse(options: {
  pagePath: string;
  kind: PageKind | undefined;
}): boolean {
  if (isBlogContentPath(options.pagePath)) {
    return false;
  }
  return isCanonicalDocsPageKind(options.kind);
}

export function splitMdxFrontmatter(mdxSource: string): {
  frontmatter: string | undefined;
  body: string;
} {
  const match = mdxSource.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: undefined, body: mdxSource };
  }
  return { frontmatter: match[1], body: match[2] ?? "" };
}

function lineContext(
  source: string,
  index: number,
): { line: number; snippet: string } {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  const snippet = source.split("\n")[line - 1]?.trim().slice(0, 120) ?? "";
  return { line, snippet };
}

function looksLikeMessageKey(value: string): boolean {
  return allowedMessageKeyPattern.test(value);
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim().length > 0 ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringValues(entry));
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => collectStringValues(entry));
  }
  return [];
}

function collectDistinctMessageProse(messages: PageMessages): string[] {
  return [...new Set(collectStringValues(messages))];
}

function collectAssetResolvedProse(
  messages: PageMessages,
  assets: PageAssetConfig,
): string[] {
  const prose: string[] = [];
  for (const asset of Object.values(assets)) {
    for (const key of assetMessageKeys(asset)) {
      const value = getMessageString(messages, key);
      if (value) {
        prose.push(value);
      }
    }
  }
  return [...new Set(prose.filter((value) => value.trim().length > 0))];
}

function stripAllowedMdxSyntax(mdxBody: string): string {
  let body = mdxBody;

  body = body.replace(/^import\s+.+$/gm, "");
  body = body.replace(/```[\s\S]*?```/g, "");
  body = body.replace(/`[^`\n]+`/g, "");
  body = body.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  body = body.replace(/<!--[\s\S]*?-->/g, "");
  body = body.replace(/\$\$[\s\S]*?\$\$/g, "");
  body = body.replace(/\{[\s\S]*?\}/g, "");

  let previous = "";
  while (previous !== body) {
    previous = body;
    body = body.replace(/<[^>\n]+\/>/g, "");
    body = body.replace(/<([A-Z][A-Za-z0-9]*)[^>]*>[\s\S]*?<\/\1>/g, "");
  }

  return body;
}

function findMarkdownHeadingViolations(
  mdxBody: string,
  pagePath: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const headingPattern = /^#{1,6}\s+\S.+$/gm;

  for (const match of mdxBody.matchAll(headingPattern)) {
    if (match.index === undefined || !match[0]) {
      continue;
    }
    const { line, snippet } = lineContext(mdxBody, match.index);
    errors.push({
      code: "mdx-hard-coded-heading",
      message: `${pagePath}:${line}: canonical MDX must not contain markdown headings; use Section titleKey and message keys instead — near: ${snippet}`,
      path: pagePath,
    });
  }

  return errors;
}

function findDisallowedAttributeViolations(
  mdxBody: string,
  pagePath: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const attributeName of disallowedReaderFacingAttributes) {
    const pattern = new RegExp(`\\b${attributeName}="([^"]+)"`, "g");
    for (const match of mdxBody.matchAll(pattern)) {
      if (match.index === undefined || !match[1]) {
        continue;
      }
      const value = match[1];
      if (looksLikeMessageKey(value)) {
        continue;
      }
      const { line, snippet } = lineContext(mdxBody, match.index);
      errors.push({
        code: "mdx-hard-coded-attribute",
        message: `${pagePath}:${line}: ${attributeName} must use a message key, not reader-facing prose — near: ${snippet}`,
        path: pagePath,
      });
    }
  }

  return errors;
}

function findResidualProseViolations(
  mdxBody: string,
  pagePath: string,
): ValidationError[] {
  const residual = stripAllowedMdxSyntax(mdxBody);
  const proseChunks =
    residual.match(/[A-Za-z][A-Za-z0-9'’,.\-:;!?()/\s]{11,}/g) ?? [];

  const errors: ValidationError[] = [];
  for (const chunk of proseChunks) {
    const trimmed = chunk.trim();
    if (trimmed.length < 12) {
      continue;
    }
    const index = mdxBody.indexOf(trimmed);
    const { line, snippet } =
      index >= 0
        ? lineContext(mdxBody, index)
        : { line: 0, snippet: trimmed.slice(0, 80) };
    errors.push({
      code: "mdx-hard-coded-prose",
      message: `${pagePath}:${line}: MDX body contains reader-facing prose that should live in messages — near: ${snippet}`,
      path: pagePath,
    });
  }

  return errors;
}

function findLeakedMessageProseViolations(
  messages: PageMessages,
  mdxBody: string,
  pagePath: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const prose of collectDistinctMessageProse(messages)) {
    if (prose.length < MIN_LEAKED_PROSE_LENGTH) {
      continue;
    }
    const index = mdxBody.indexOf(prose);
    if (index < 0) {
      continue;
    }
    const { line, snippet } = lineContext(mdxBody, index);
    errors.push({
      code: "mdx-hard-coded-prose",
      message: `${pagePath}:${line}: MDX body repeats message prose that should stay in messages/en.json — near: ${snippet.slice(0, 80)}`,
      path: pagePath,
    });
  }

  return errors;
}

function findLeakedAssetProseViolations(
  messages: PageMessages,
  assets: PageAssetConfig,
  mdxBody: string,
  pagePath: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const prose of collectAssetResolvedProse(messages, assets)) {
    if (prose.length < MIN_LEAKED_PROSE_LENGTH) {
      continue;
    }
    const index = mdxBody.indexOf(prose);
    if (index < 0) {
      continue;
    }
    const { line, snippet } = lineContext(mdxBody, index);
    errors.push({
      code: "mdx-hard-coded-prose",
      message: `${pagePath}:${line}: MDX body repeats asset text that should stay in messages/assets — near: ${snippet.slice(0, 80)}`,
      path: pagePath,
    });
  }

  return errors;
}

export type ValidateCanonicalMdxProseOptions = {
  pagePath: string;
  kind: PageKind | undefined;
  mdxSource: string;
  messages?: PageMessages;
  assets?: PageAssetConfig;
};

export function validateCanonicalMdxProse(
  options: ValidateCanonicalMdxProseOptions,
): ValidationError[] {
  if (!shouldValidateCanonicalMdxProse(options)) {
    return [];
  }

  const { pagePath, mdxSource, messages, assets } = options;
  const { body: mdxBody } = splitMdxFrontmatter(mdxSource);
  const errors: ValidationError[] = [
    ...findMarkdownHeadingViolations(mdxBody, pagePath),
    ...findDisallowedAttributeViolations(mdxBody, pagePath),
  ];

  if (messages) {
    errors.push(
      ...findLeakedMessageProseViolations(messages, mdxBody, pagePath),
    );
  }

  if (messages && assets) {
    errors.push(
      ...findLeakedAssetProseViolations(messages, assets, mdxBody, pagePath),
    );
  }

  errors.push(...findResidualProseViolations(mdxBody, pagePath));

  return errors;
}
