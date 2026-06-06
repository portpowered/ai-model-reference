"use client";

import type { ReactNode } from "react";
import { proseAutoLinkClassName } from "@/features/docs/components/prose-auto-link-class";
import { segmentProseWithAutoLinks } from "@/lib/content/prose-auto-link";
import { PROSE_AUTO_LINK_PHRASES } from "@/lib/content/prose-auto-link-runtime";

export function ProseAutoLinkText({ text }: { text: string }) {
  const segments = segmentProseWithAutoLinks(text, PROSE_AUTO_LINK_PHRASES);

  if (segments.length === 1 && segments[0]?.type === "text") {
    return <>{segments[0].value}</>;
  }

  let textOffset = 0;
  const nodes: ReactNode[] = segments.map((segment) => {
    if (segment.type === "text") {
      const node = segment.value;
      textOffset += segment.value.length;
      return node;
    }

    const key = `${textOffset}:${segment.href}:${segment.value}`;
    textOffset += segment.value.length;

    return (
      <a
        key={key}
        href={segment.href}
        className={proseAutoLinkClassName}
        data-prose-auto-link="true"
      >
        {segment.value}
      </a>
    );
  });

  return <>{nodes}</>;
}
