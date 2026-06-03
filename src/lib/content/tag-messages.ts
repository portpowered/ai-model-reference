import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const TAG_MESSAGES_ROOT = join(
  process.cwd(),
  "src/content/registry/tags/messages",
);

const tagMessagesSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

export type TagMessages = z.infer<typeof tagMessagesSchema>;

export function loadTagMessages(slug: string, locale = "en"): TagMessages {
  const path = join(TAG_MESSAGES_ROOT, `${slug}.${locale}.json`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return tagMessagesSchema.parse(raw);
}
