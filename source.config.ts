import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "src/content/docs",
  docs: {
    // Module and glossary pages use next-mdx-remote + ModulePageProviders at dedicated routes.
    files: ["**/*.{md,mdx}", "!modules/**", "!glossary/**"],
  },
});

export default defineConfig();
