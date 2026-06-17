import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { SiteLocale } from "@/lib/i18n/locale-routing";
import { TAG_MESSAGES_ROOT } from "./content-paths";

const tagMessagesSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

export type TagMessages = z.infer<typeof tagMessagesSchema>;

export type TagMessagesLoadErrorDetail =
  | { type: "missing-file"; path: string; locale: SiteLocale; slug: string }
  | {
      type: "parse-error";
      path: string;
      locale: SiteLocale;
      slug: string;
      message: string;
    };

export class TagMessagesLoadError extends Error {
  readonly details: TagMessagesLoadErrorDetail[];

  constructor(message: string, details: TagMessagesLoadErrorDetail[]) {
    super(message);
    this.name = "TagMessagesLoadError";
    this.details = details;
  }
}

type TagMessagesLoadOptions = {
  route?: string;
};

export function loadTagMessages(
  slug: string,
  locale: SiteLocale,
  options: TagMessagesLoadOptions = {},
): TagMessages {
  const path = join(TAG_MESSAGES_ROOT, `${slug}.${locale}.json`);
  const route = options.route ? ` for route "${options.route}"` : "";

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      throw new TagMessagesLoadError(
        `Missing tag messages file${route} for locale "${locale}": ${path}`,
        [{ type: "missing-file", path, locale, slug }],
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new TagMessagesLoadError(
      `Failed to read tag messages file${route}: ${path}`,
      [{ type: "parse-error", path, locale, slug, message }],
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new TagMessagesLoadError(
      `Invalid JSON in tag messages file${route}: ${path}`,
      [{ type: "parse-error", path, locale, slug, message }],
    );
  }

  const result = tagMessagesSchema.safeParse(json);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new TagMessagesLoadError(
      `Tag messages schema validation failed${route}: ${path}`,
      [{ type: "parse-error", path, locale, slug, message }],
    );
  }

  return result.data;
}
