import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

const docsPageSchema = pageSchema.extend({
  kind: z.string().optional(),
  registryId: z.string().optional(),
  messageNamespace: z.union([z.literal("local"), z.string().min(1)]).optional(),
  assetNamespace: z.union([z.literal("local"), z.string().min(1)]).optional(),
  status: z.string().optional(),
});

export const docs = defineDocs({
  dir: "src/content/docs",
  docs: {
    // Glossary and module MDX are catch-all routes only (no per-slug App Router stubs).
    // Local message-key pages render via next-mdx-remote + ModulePageProviders in [[...slug]]/page.tsx.
    files: ["**/*.{md,mdx}"],
    schema: docsPageSchema,
  },
});

export default defineConfig();
