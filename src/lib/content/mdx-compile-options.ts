import type { CompileOptions } from "@mdx-js/mdx";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

export const moduleMdxCompileOptions = {
  parseFrontmatter: true,
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  } satisfies Omit<CompileOptions, "outputFormat" | "providerImportSource"> & {
    useDynamicImport?: boolean;
  },
};
