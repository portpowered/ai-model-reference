import { readFileSync } from "node:fs";
import {
  type ListPublishedBlogPostsOptions,
  listPublishedBlogPosts,
} from "@/lib/content/blog-post-list";
import type { LoadedBlogPostSidecars } from "@/lib/content/blog-post-load";
import type { BlogPostMessages } from "@/lib/content/blog-post-messages";
import type { RegistryIndexes, RegistryRecord } from "@/lib/content/registry";
import type { TagRecord } from "@/lib/content/schemas";
import { enrichSearchDocument } from "./enrich-search-document";
import type { BaseSearchDocument, SearchDocument } from "./types";
import { EMPTY_SEARCH_DOCUMENT_TOPOLOGY } from "./types";

export const BLOG_SEARCH_DOCUMENT_KIND = "blog";

export type BlogSearchPostSource = LoadedBlogPostSidecars & {
  mdxBody: string;
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isTagRecord(record: RegistryRecord): record is TagRecord {
  return record.kind === "tag";
}

function tagSearchTerms(
  indexes: RegistryIndexes,
  tagSlugs: string[],
): string[] {
  const terms: string[] = [];
  for (const slug of tagSlugs) {
    terms.push(slug);
    const record = indexes.tagsBySlug.get(slug);
    if (record && isTagRecord(record)) {
      terms.push(record.slug, ...record.aliases);
    }
  }
  return unique(terms);
}

export function splitBlogPostMdxBody(source: string): string {
  const match = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match?.[1] ?? "";
}

function stripInlineMdx(title: string): string {
  return title.replace(/<[^>]+>/g, "").trim();
}

export function extractBlogMdxSearchText(mdxBody: string): {
  headings: string[];
  bodyText: string;
} {
  const withoutImports = mdxBody.replace(/^import\s+.+$/gm, "");
  const headings: string[] = [];
  const markdownHeadingPattern = /^#{1,6}\s+(.+)$/gm;

  for (const match of withoutImports.matchAll(markdownHeadingPattern)) {
    const title = stripInlineMdx(match[1]?.trim() ?? "");
    if (title) {
      headings.push(title);
    }
  }

  const prose = withoutImports
    .replace(/^import\s+.+$/gm, "")
    .replace(/<[^>]+\/>/g, " ")
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  return { headings, bodyText: prose };
}

function collectBlogMessageBodyText(messages: BlogPostMessages): string {
  return [messages.contextSentence, messages.takeaway]
    .filter(Boolean)
    .join("\n");
}

export function buildBlogBaseSearchDocument(
  post: BlogSearchPostSource,
  indexes: RegistryIndexes,
): BaseSearchDocument {
  const url = `/blog/${post.slug}`;
  const tags = post.frontmatter.tags;
  const tagTerms = tagSearchTerms(indexes, tags);
  const mdxSearch = extractBlogMdxSearchText(post.mdxBody);
  const messageBody = collectBlogMessageBodyText(post.messages);
  const bodyText = unique([
    post.frontmatter.publishedAt,
    messageBody,
    mdxSearch.bodyText,
  ])
    .filter(Boolean)
    .join("\n");

  return {
    id: url,
    url,
    kind: BLOG_SEARCH_DOCUMENT_KIND,
    title: post.messages.title,
    description: post.messages.description,
    publishedAt: post.frontmatter.publishedAt,
    bodyText,
    headings: unique([post.messages.title, ...mdxSearch.headings]),
    directAliases: [],
    aliases: tagTerms,
    tags,
    relatedIds: post.frontmatter.relatedDocIds,
    facets: {
      kind: BLOG_SEARCH_DOCUMENT_KIND,
      tags,
    },
    topology: { ...EMPTY_SEARCH_DOCUMENT_TOPOLOGY },
  };
}

export function buildBlogSearchDocument(
  post: BlogSearchPostSource,
  indexes: RegistryIndexes,
): SearchDocument {
  const base = buildBlogBaseSearchDocument(post, indexes);
  return enrichSearchDocument(base, indexes);
}

export function buildBlogSearchDocuments(
  posts: BlogSearchPostSource[],
  indexes: RegistryIndexes,
): SearchDocument[] {
  return posts.map((post) => buildBlogSearchDocument(post, indexes));
}

export async function loadBlogSearchPostSources(
  options: ListPublishedBlogPostsOptions = {},
): Promise<BlogSearchPostSource[]> {
  const posts = await listPublishedBlogPosts(options);
  return posts.map((post) => ({
    ...post,
    mdxBody: splitBlogPostMdxBody(readFileSync(post.sourcePath, "utf8")),
  }));
}
