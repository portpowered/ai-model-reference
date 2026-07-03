import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import type { LoadedBlogPost } from "./blog-page-load";

export type { LoadedBlogPost } from "./blog-page-load";

import type { LoadBlogPostFromDiskOptions } from "./blog-page-load";

/** Loads a published blog post bundle via a dynamic import boundary. */
export async function loadBlogPost(
  slug: string,
  locale: SiteLocale = defaultLocale,
  options: LoadBlogPostFromDiskOptions = {},
): Promise<LoadedBlogPost> {
  const { loadBlogPostFromDisk } = await import("./blog-page-load");
  return loadBlogPostFromDisk(slug, locale, options);
}
