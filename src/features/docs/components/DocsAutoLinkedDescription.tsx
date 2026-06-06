"use client";

import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";

/** Glossary shell description rendered with the same safe prose auto-linking as body copy. */
export function DocsAutoLinkedDescription({ text }: { text: string }) {
  return <ProseAutoLinkText text={text} />;
}
