import type { Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

function classNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      typeof entry === "string" ? entry.split(/\s+/) : [],
    );
  }
  if (typeof value === "string") {
    return value.split(/\s+/);
  }
  return [];
}

/** Adds rich-content math scroll markers to KaTeX display nodes from remark-math. */
export const rehypeRichContentMath: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node) => {
      const classes = classNames(node.properties?.className);
      if (!classes.includes("katex-display")) {
        return;
      }

      node.properties = {
        ...node.properties,
        dataRichContentScroll: "math",
        className: [...new Set([...classes, "max-w-full", "overflow-x-auto"])],
      };
    });
  };
};
