import { z } from "zod";

export const blogPostMessagesSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  contextSentence: z.string().optional(),
  takeaway: z.string().optional(),
});

export type BlogPostMessages = z.infer<typeof blogPostMessagesSchema>;
