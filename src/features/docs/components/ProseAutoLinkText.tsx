"use client";

import type { ReactNode } from "react";
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
        className="text-primary underline-offset-4 hover:underline"
        data-prose-auto-link="true"
      >
        {segment.value}
      </a>
    );
  });

  return <>{nodes}</>;
}
