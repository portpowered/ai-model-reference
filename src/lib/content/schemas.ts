import { z } from "zod";

export const registryStatusSchema = z.enum(["draft", "published", "archived"]);

export const pageMessagesSchema = z.object({
  title: z.string(),
  description: z.string(),
  problemStatement: z.string().optional(),
  coreIdea: z.string().optional(),
  sections: z
    .record(
      z.object({
        title: z.string(),
        body: z.string().optional(),
      }),
    )
    .optional(),
  callouts: z
    .record(
      z.object({
        title: z.string().optional(),
        body: z.string(),
      }),
    )
    .optional(),
  assets: z
    .record(
      z.object({
        alt: z.string().optional(),
        caption: z.string().optional(),
      }),
    )
    .optional(),
});

export type PageMessages = z.infer<typeof pageMessagesSchema>;
