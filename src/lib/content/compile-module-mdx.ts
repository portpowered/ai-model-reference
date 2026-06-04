import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import { moduleMdxCompileOptions } from "@/lib/content/mdx-compile-options";
import { moduleMdxComponents } from "@/lib/content/mdx-components";

export async function compileModuleMdx(source: string): Promise<ReactElement> {
  const { content } = await compileMDX({
    source,
    components: moduleMdxComponents,
    options: moduleMdxCompileOptions,
  });

  return content;
}
