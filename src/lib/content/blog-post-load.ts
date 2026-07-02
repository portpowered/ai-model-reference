import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parsePageAssetConfig } from "@/lib/content/assets";
import {
  type BlogPostFrontmatter,
  blogPostFrontmatterSchema,
  parseBlogPostFrontmatter,
} from "@/lib/content/blog-frontmatter";
import {
  type BlogPostMessages,
  blogPostMessagesSchema,
} from "@/lib/content/blog-post-messages";
import { BLOG_ROOT } from "@/lib/content/content-paths";
import type { PageAssetConfig } from "@/lib/content/schemas";
import { parseYamlFrontmatterBlock } from "@/lib/content/yaml-frontmatter";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

export type BlogPostLoadErrorDetail =
  | { type: "missing-file"; path: string; locale?: SiteLocale }
  | { type: "parse-error"; path: string; message: string; locale?: SiteLocale }
  | {
      type: "unsupported-namespace";
      field: "messageNamespace" | "assetNamespace";
      value: string;
    };

export class BlogPostLoadError extends Error {
  readonly slug: string;
  readonly sourcePath: string;
  readonly details: BlogPostLoadErrorDetail[];

  constructor(
    message: string,
    context: { slug: string; sourcePath: string },
    details: BlogPostLoadErrorDetail[],
  ) {
    super(message);
    this.name = "BlogPostLoadError";
    this.slug = context.slug;
    this.sourcePath = context.sourcePath;
    this.details = details;
  }
}

export type LoadedBlogPostSidecars = {
  slug: string;
  sourcePath: string;
  frontmatter: BlogPostFrontmatter;
  messages: BlogPostMessages;
  assets: PageAssetConfig;
};

type LoadBlogPostSidecarsOptions = {
  blogRoot?: string;
  locale?: SiteLocale;
};

function blogPostPageDir(blogRoot: string, slug: string): string {
  return join(blogRoot, slug);
}

function blogPostMdxPath(pageDir: string): string {
  return join(pageDir, "page.mdx");
}

function blogPostMessagesPath(pageDir: string, locale: SiteLocale): string {
  return join(pageDir, "messages", `${locale}.json`);
}

function blogPostAssetsPath(pageDir: string): string {
  return join(pageDir, "assets.json");
}

export function readBlogPostFrontmatter(
  slug: string,
  options: { blogRoot?: string } = {},
): BlogPostFrontmatter {
  const blogRoot = options.blogRoot ?? BLOG_ROOT;
  const pageDir = blogPostPageDir(blogRoot, slug);
  const sourcePath = blogPostMdxPath(pageDir);
  return parseBlogPostFrontmatterFromMdx(sourcePath, { slug, sourcePath });
}

function parseBlogPostFrontmatterFromMdx(
  mdxPath: string,
  context: { slug: string; sourcePath: string },
): BlogPostFrontmatter {
  const source = readFileSync(mdxPath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    throw new BlogPostLoadError(
      `Missing frontmatter in blog post ${context.slug}: ${mdxPath}`,
      context,
      [
        {
          type: "parse-error",
          path: mdxPath,
          message: "Missing frontmatter block",
        },
      ],
    );
  }

  const parsed = parseBlogPostFrontmatter(parseYamlFrontmatterBlock(match[1]));
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new BlogPostLoadError(
      `Invalid blog post frontmatter for ${context.slug}: ${mdxPath}`,
      context,
      [{ type: "parse-error", path: mdxPath, message }],
    );
  }

  return parsed.data;
}

async function loadLocalBlogPostMessages(
  pageDir: string,
  locale: SiteLocale,
  context: { slug: string; sourcePath: string },
): Promise<BlogPostMessages> {
  const path = blogPostMessagesPath(pageDir, locale);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      throw new BlogPostLoadError(
        `Missing required local messages for blog post "${context.slug}": ${path}`,
        context,
        [{ type: "missing-file", path, locale }],
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new BlogPostLoadError(
      `Failed to read local messages for blog post "${context.slug}": ${path}`,
      context,
      [{ type: "parse-error", path, message, locale }],
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BlogPostLoadError(
      `Invalid JSON in local messages for blog post "${context.slug}": ${path}`,
      context,
      [{ type: "parse-error", path, message, locale }],
    );
  }

  const result = blogPostMessagesSchema.safeParse(json);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new BlogPostLoadError(
      `Blog post messages schema validation failed for "${context.slug}": ${path}`,
      context,
      [{ type: "parse-error", path, message, locale }],
    );
  }

  return result.data;
}

async function loadLocalBlogPostAssets(
  pageDir: string,
  context: { slug: string; sourcePath: string },
): Promise<PageAssetConfig> {
  const path = blogPostAssetsPath(pageDir);
  if (!existsSync(path)) {
    return {};
  }

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BlogPostLoadError(
      `Failed to read local assets for blog post "${context.slug}": ${path}`,
      context,
      [{ type: "parse-error", path, message }],
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BlogPostLoadError(
      `Invalid JSON in local assets for blog post "${context.slug}": ${path}`,
      context,
      [{ type: "parse-error", path, message }],
    );
  }

  try {
    return parsePageAssetConfig(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BlogPostLoadError(
      `Blog post asset config validation failed for "${context.slug}": ${path}`,
      context,
      [{ type: "parse-error", path, message }],
    );
  }
}

function assertLocalNamespace(
  frontmatter: BlogPostFrontmatter,
  context: { slug: string; sourcePath: string },
): void {
  if (frontmatter.messageNamespace !== "local") {
    throw new BlogPostLoadError(
      `Blog post "${context.slug}" uses unsupported messageNamespace "${frontmatter.messageNamespace}"`,
      context,
      [
        {
          type: "unsupported-namespace",
          field: "messageNamespace",
          value: frontmatter.messageNamespace,
        },
      ],
    );
  }

  if (frontmatter.assetNamespace !== "local") {
    throw new BlogPostLoadError(
      `Blog post "${context.slug}" uses unsupported assetNamespace "${frontmatter.assetNamespace}"`,
      context,
      [
        {
          type: "unsupported-namespace",
          field: "assetNamespace",
          value: frontmatter.assetNamespace,
        },
      ],
    );
  }
}

export async function loadBlogPostSidecars(
  slug: string,
  options: LoadBlogPostSidecarsOptions = {},
): Promise<LoadedBlogPostSidecars> {
  const blogRoot = options.blogRoot ?? BLOG_ROOT;
  const locale = options.locale ?? defaultLocale;
  const pageDir = blogPostPageDir(blogRoot, slug);
  const sourcePath = blogPostMdxPath(pageDir);
  const context = { slug, sourcePath };

  const frontmatter = parseBlogPostFrontmatterFromMdx(sourcePath, context);
  blogPostFrontmatterSchema.parse(frontmatter);
  assertLocalNamespace(frontmatter, context);

  const [messages, assets] = await Promise.all([
    loadLocalBlogPostMessages(pageDir, locale, context),
    loadLocalBlogPostAssets(pageDir, context),
  ]);

  return {
    slug,
    sourcePath,
    frontmatter,
    messages,
    assets,
  };
}
