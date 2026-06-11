import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import type { ComponentProps } from "react";

type DocsCodeBlockProps = ComponentProps<typeof CodeBlock>;

/** Fumadocs fenced-code wrapper with a stable rich-content scroll marker. */
export function DocsCodeBlock({
  viewportProps,
  children,
  ...props
}: DocsCodeBlockProps) {
  return (
    <CodeBlock
      {...props}
      viewportProps={
        {
          ...viewportProps,
          "data-rich-content-scroll": "code",
        } as DocsCodeBlockProps["viewportProps"]
      }
    >
      {children}
    </CodeBlock>
  );
}

/** MDX `pre` mapping that preserves Fumadocs copy affordances and scroll region. */
export function DocsPre(props: DocsCodeBlockProps) {
  return (
    <DocsCodeBlock {...props}>
      <Pre>{props.children}</Pre>
    </DocsCodeBlock>
  );
}
