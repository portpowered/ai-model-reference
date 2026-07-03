import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { parsePageAssetConfig } from "./assets";
import {
  type BlogPostFrontmatter,
  isBlogPostPubliclyVisible,
  parseBlogPostFrontmatter,
} from "./blog-frontmatter";
import { discoverBlogPostSlugs } from "./blog-post-list";
import { blogPostMessagesSchema } from "./blog-post-messages";
import { BLOG_ROOT, getBlogPageDir } from "./content-paths";
import {
  getPublishedDocsHrefForRecord,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "./published-docs-registry-ids";
import type { RegistryIndexes, RegistryRecord } from "./registry";
import type { ValidationError } from "./validate-registry";
import { parseYamlFrontmatterBlock } from "./yaml-frontmatter";

export type ValidatePublishedBlogPostsOptions = {
  blogRoot?: string;
  indexes: RegistryIndexes;
  locale?: SiteLocale;
};

function blogRouteHref(slug: string): string {
  return `/blog/${slug}`;
}

function resolveTagRecord(
  tagRef: string,
  indexes: RegistryIndexes,
): RegistryRecord | undefined {
  const bySlug = indexes.bySlug.get(tagRef);
  if (bySlug?.kind === "tag") {
    return bySlug;
  }

  const tagId = tagRef.startsWith("tag.") ? tagRef : `tag.${tagRef}`;
  const byId = indexes.byId.get(tagId);
  if (byId?.kind === "tag") {
    return byId;
  }

  return undefined;
}

function hasPublishedDocsTarget(record: RegistryRecord): boolean {
  return (
    PUBLISHED_DOCS_REGISTRY_IDS.has(record.id) &&
    Boolean(getPublishedDocsHrefForRecord(record))
  );
}

function resolveRelatedDocId(
  relatedDocId: string,
  indexes: RegistryIndexes,
): RegistryRecord | undefined {
  const record = indexes.byId.get(relatedDocId);
  if (!record || !hasPublishedDocsTarget(record)) {
    return undefined;
  }

  return record;
}

function formatZodIssues(
  issues: Array<{ path: Array<string | number>; message: string }>,
): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
    .join("; ");
}

function readBlogPostMdxSource(
  slug: string,
  mdxPath: string,
): { source: string } | { errors: ValidationError[] } {
  if (!existsSync(mdxPath)) {
    const route = blogRouteHref(slug);
    return {
      errors: [
        {
          code: "missing-blog-page",
          message: `${route}: missing blog page source at ${mdxPath}`,
          path: mdxPath,
        },
      ],
    };
  }

  return { source: readFileSync(mdxPath, "utf8") };
}

function parseBlogFrontmatterForValidation(
  slug: string,
  mdxPath: string,
  source: string,
): { frontmatter: BlogPostFrontmatter } | { errors: ValidationError[] } {
  const route = blogRouteHref(slug);
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    return {
      errors: [
        {
          code: "missing-blog-frontmatter",
          message: `${route}: missing frontmatter block in ${mdxPath}`,
          path: mdxPath,
        },
      ],
    };
  }

  const parsed = parseBlogPostFrontmatter(parseYamlFrontmatterBlock(match[1]));
  if (!parsed.success) {
    return {
      errors: [
        {
          code: "invalid-blog-frontmatter",
          message: `${route}: invalid frontmatter ${formatZodIssues(parsed.error.issues)}`,
          path: mdxPath,
        },
      ],
    };
  }

  return { frontmatter: parsed.data };
}

function validatePublishedBlogFrontmatter(
  slug: string,
  mdxPath: string,
  frontmatter: BlogPostFrontmatter,
): ValidationError[] {
  const route = blogRouteHref(slug);
  const errors: ValidationError[] = [];

  if (frontmatter.messageNamespace !== "local") {
    errors.push({
      code: "unsupported-blog-message-namespace",
      message: `${route}: messageNamespace must be "local", got "${frontmatter.messageNamespace}"`,
      path: mdxPath,
    });
  }

  if (frontmatter.assetNamespace !== "local") {
    errors.push({
      code: "unsupported-blog-asset-namespace",
      message: `${route}: assetNamespace must be "local", got "${frontmatter.assetNamespace}"`,
      path: mdxPath,
    });
  }

  if (frontmatter.authors.length === 0) {
    errors.push({
      code: "missing-blog-authors",
      message: `${route}: published blog posts must include at least one author`,
      path: mdxPath,
    });
  }

  return errors;
}

function validatePublishedBlogTags(
  slug: string,
  mdxPath: string,
  frontmatter: BlogPostFrontmatter,
  indexes: RegistryIndexes,
): ValidationError[] {
  const route = blogRouteHref(slug);
  const errors: ValidationError[] = [];

  for (const tagRef of frontmatter.tags) {
    if (!resolveTagRecord(tagRef, indexes)) {
      errors.push({
        code: "unresolved-blog-tag",
        message: `${route}: frontmatter tag "${tagRef}" does not resolve to a tag record`,
        path: mdxPath,
      });
    }
  }

  return errors;
}

function validatePublishedBlogRelatedDocIds(
  slug: string,
  mdxPath: string,
  frontmatter: BlogPostFrontmatter,
  indexes: RegistryIndexes,
): ValidationError[] {
  const route = blogRouteHref(slug);
  const errors: ValidationError[] = [];

  for (const relatedDocId of frontmatter.relatedDocIds) {
    if (!resolveRelatedDocId(relatedDocId, indexes)) {
      errors.push({
        code: "unresolved-blog-related-doc",
        message: `${route}: relatedDocIds entry "${relatedDocId}" does not resolve to a published canonical docs target`,
        path: mdxPath,
      });
    }
  }

  return errors;
}

function validatePublishedBlogMessages(
  slug: string,
  pageDir: string,
  locale: SiteLocale,
): ValidationError[] {
  const route = blogRouteHref(slug);
  const messagesPath = join(pageDir, "messages", `${locale}.json`);
  const errors: ValidationError[] = [];

  if (!existsSync(messagesPath)) {
    errors.push({
      code: "missing-blog-messages",
      message: `${route}: messageNamespace "local" requires default locale messages at ${messagesPath}`,
      path: messagesPath,
    });
    return errors;
  }

  let json: unknown;
  try {
    json = JSON.parse(readFileSync(messagesPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      code: "invalid-blog-messages-json",
      message: `${route}: invalid JSON in local messages ${messagesPath}: ${message}`,
      path: messagesPath,
    });
    return errors;
  }

  const parsed = blogPostMessagesSchema.safeParse(json);
  if (!parsed.success) {
    errors.push({
      code: "invalid-blog-messages",
      message: `${route}: local messages failed validation at ${messagesPath}: ${formatZodIssues(parsed.error.issues)}`,
      path: messagesPath,
    });
  }

  return errors;
}

function validatePublishedBlogAssets(
  slug: string,
  pageDir: string,
): ValidationError[] {
  const route = blogRouteHref(slug);
  const assetsPath = join(pageDir, "assets.json");
  const errors: ValidationError[] = [];

  if (!existsSync(assetsPath)) {
    return errors;
  }

  let json: unknown;
  try {
    json = JSON.parse(readFileSync(assetsPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      code: "invalid-blog-assets-json",
      message: `${route}: invalid JSON in local assets ${assetsPath}: ${message}`,
      path: assetsPath,
    });
    return errors;
  }

  try {
    parsePageAssetConfig(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      code: "invalid-blog-assets",
      message: `${route}: local asset config failed validation at ${assetsPath}: ${message}`,
      path: assetsPath,
    });
  }

  return errors;
}

export async function validatePublishedBlogPosts(
  options: ValidatePublishedBlogPostsOptions,
): Promise<ValidationError[]> {
  const blogRoot = options.blogRoot ?? BLOG_ROOT;
  const locale = options.locale ?? defaultLocale;
  const errors: ValidationError[] = [];

  if (!existsSync(blogRoot)) {
    return errors;
  }

  for (const slug of discoverBlogPostSlugs(blogRoot)) {
    const pageDir = getBlogPageDir(slug, blogRoot);
    const mdxPath = join(pageDir, "page.mdx");
    const sourceResult = readBlogPostMdxSource(slug, mdxPath);
    if ("errors" in sourceResult) {
      errors.push(...sourceResult.errors);
      continue;
    }

    const frontmatterResult = parseBlogFrontmatterForValidation(
      slug,
      mdxPath,
      sourceResult.source,
    );
    if ("errors" in frontmatterResult) {
      errors.push(...frontmatterResult.errors);
      continue;
    }

    const { frontmatter } = frontmatterResult;
    if (!isBlogPostPubliclyVisible(frontmatter)) {
      continue;
    }

    errors.push(
      ...validatePublishedBlogFrontmatter(slug, mdxPath, frontmatter),
      ...validatePublishedBlogTags(slug, mdxPath, frontmatter, options.indexes),
      ...validatePublishedBlogRelatedDocIds(
        slug,
        mdxPath,
        frontmatter,
        options.indexes,
      ),
      ...validatePublishedBlogMessages(slug, pageDir, locale),
      ...validatePublishedBlogAssets(slug, pageDir),
    );
  }

  return errors;
}
