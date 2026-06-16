"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { InlineMath } from "@/features/docs/components/Math";
import { proseAutoLinkClassName } from "@/features/docs/components/prose-auto-link-class";
import { segmentProseWithAutoLinks } from "@/lib/content/prose-auto-link";
import { PROSE_AUTO_LINK_PHRASES } from "@/lib/content/prose-auto-link-runtime";

type ProseInlineSegment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "math";
      formula: string;
    };

function isEscaped(value: string, index: number): boolean {
  let slashCount = 0;

  for (
    let cursor = index - 1;
    cursor >= 0 && value[cursor] === "\\";
    cursor -= 1
  ) {
    slashCount += 1;
  }

  return slashCount % 2 === 1;
}

function findClosingInlineMathDelimiter(
  text: string,
  startIndex: number,
): number {
  for (let cursor = startIndex + 1; cursor < text.length; cursor += 1) {
    if (
      text[cursor] === "$" &&
      text[cursor + 1] !== "$" &&
      !isEscaped(text, cursor)
    ) {
      return cursor;
    }
  }

  return -1;
}

function splitProseInlineMath(text: string): ProseInlineSegment[] {
  const segments: ProseInlineSegment[] = [];
  let textStart = 0;
  let searchStart = 0;

  while (searchStart < text.length) {
    const openIndex = text.indexOf("$", searchStart);

    if (openIndex === -1) {
      segments.push({ type: "text", value: text.slice(textStart) });
      break;
    }

    if (text[openIndex + 1] === "$") {
      searchStart = openIndex + 2;
      continue;
    }

    if (isEscaped(text, openIndex)) {
      searchStart = openIndex + 1;
      continue;
    }

    const closeIndex = findClosingInlineMathDelimiter(text, openIndex);
    if (closeIndex === -1) {
      segments.push({ type: "text", value: text.slice(textStart) });
      break;
    }

    if (openIndex > textStart) {
      segments.push({ type: "text", value: text.slice(textStart, openIndex) });
    }

    const formula = text.slice(openIndex + 1, closeIndex);
    if (formula.trim().length > 0) {
      segments.push({ type: "math", formula });
    } else {
      segments.push({
        type: "text",
        value: text.slice(openIndex, closeIndex + 1),
      });
    }

    textStart = closeIndex + 1;
    searchStart = closeIndex + 1;
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

function renderAutoLinkedText(text: string, keyPrefix: string): ReactNode[] {
  const segments = segmentProseWithAutoLinks(text, PROSE_AUTO_LINK_PHRASES);
  let textOffset = 0;

  return segments.map((segment, index) => {
    if (segment.type === "text") {
      textOffset += segment.value.length;
      return segment.value.replaceAll("\\$", "$");
    }

    const key = `${keyPrefix}:${index}:${textOffset}:${segment.href}:${segment.value}`;
    textOffset += segment.value.length;

    return (
      <Link
        key={key}
        href={segment.href}
        className={proseAutoLinkClassName}
        data-prose-auto-link="true"
      >
        {segment.value}
      </Link>
    );
  });
}

export function ProseAutoLinkText({ text }: { text: string }) {
  const inlineSegments = splitProseInlineMath(text);

  if (inlineSegments.length === 1 && inlineSegments[0]?.type === "text") {
    const nodes = renderAutoLinkedText(inlineSegments[0].value, "text");
    return <>{nodes}</>;
  }

  let inlineOffset = 0;
  const nodes = inlineSegments.flatMap((segment) => {
    if (segment.type === "text") {
      const keyPrefix = `text:${inlineOffset}`;
      inlineOffset += segment.value.length;
      return renderAutoLinkedText(segment.value, keyPrefix);
    }

    const key = `math:${inlineOffset}:${segment.formula}`;
    inlineOffset += segment.formula.length + 2;

    return <InlineMath key={key} formula={segment.formula} />;
  });

  return <>{nodes}</>;
}
