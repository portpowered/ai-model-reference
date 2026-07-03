import { z } from "zod";

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const blogPostStatusSchema = z.enum(["published", "draft"]);

export const blogCalendarDateSchema = z
  .string()
  .regex(CALENDAR_DATE_PATTERN, "Use YYYY-MM-DD calendar dates.")
  .refine((value) => isValidCalendarDate(value), "Use a valid calendar date.");

export const blogPostFrontmatterSchema = z.object({
  messageNamespace: z.union([z.literal("local"), z.string().min(1)]),
  assetNamespace: z.union([z.literal("local"), z.string().min(1)]),
  publishedAt: blogCalendarDateSchema,
  updatedAt: blogCalendarDateSchema,
  authors: z.array(z.string().min(1)),
  tags: z.array(z.string()),
  relatedDocIds: z.array(z.string()),
  status: blogPostStatusSchema,
});

export type BlogPostStatus = z.infer<typeof blogPostStatusSchema>;
export type BlogPostFrontmatter = z.infer<typeof blogPostFrontmatterSchema>;

export function isValidCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isBlogPostPubliclyVisible(
  frontmatter: Pick<BlogPostFrontmatter, "status">,
): boolean {
  return frontmatter.status === "published";
}

export function parseBlogPostFrontmatter(
  raw: Record<string, unknown>,
): z.SafeParseReturnType<Record<string, unknown>, BlogPostFrontmatter> {
  return blogPostFrontmatterSchema.safeParse(raw);
}
