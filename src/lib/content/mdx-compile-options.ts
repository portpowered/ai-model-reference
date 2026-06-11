import type { CompileOptions } from "@mdx-js/mdx";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { rehypeRichContentMath } from "@/lib/content/rehype-rich-content-math";

export const moduleMdxCompileOptions = {
  parseFrontmatter: true,
  mdxOptions: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeRichContentMath],
  } satisfies Omit<CompileOptions, "outputFormat" | "providerImportSource"> & {
    useDynamicImport?: boolean;
  },
};
