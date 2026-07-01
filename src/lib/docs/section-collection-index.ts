import { notFound } from "next/navigation";
import type { UiMessages } from "@/lib/content/ui-messages";
import {
  DOCS_COLLECTION_IDS,
  type DocsCollectionDefinition,
  type DocsCollectionId,
} from "@/lib/docs/collection-definition-contract";
import { getDocsCollectionDefinition } from "@/lib/docs/docs-collection-definitions";

export type DocsCollectionInput = DocsCollectionId | DocsCollectionDefinition;

export type DocsCollectionIndexMessages = {
  title: string;
  description: string;
  listLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyHomeLink: string;
};

const SECTION_KIND_TO_COLLECTION_ID = {
  model: "models",
  module: "modules",
  concept: "concepts",
  paper: "papers",
  "training-regime": "training",
  system: "systems",
} as const satisfies Record<string, DocsCollectionId>;

export type SectionIndexFrontmatterKind =
  keyof typeof SECTION_KIND_TO_COLLECTION_ID;

export function isDocsCollectionId(value: string): value is DocsCollectionId {
  return (DOCS_COLLECTION_IDS as readonly string[]).includes(value);
}

export function resolveDocsCollectionInput(
  input: DocsCollectionInput | string,
): DocsCollectionDefinition {
  if (typeof input === "object") {
    return input;
  }

  if (!isDocsCollectionId(input)) {
    notFound();
  }

  return getDocsCollectionDefinition(input);
}

export function resolveSectionKindCollectionId(
  kind: SectionIndexFrontmatterKind,
): DocsCollectionId {
  return SECTION_KIND_TO_COLLECTION_ID[kind];
}

export function resolveUiMessagePath(
  messages: UiMessages,
  path: string,
): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (current, segment) =>
        current !== null &&
        typeof current === "object" &&
        segment in (current as Record<string, unknown>)
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      messages,
    );

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing UI message for path: ${path}`);
  }

  return value;
}

export function resolveDocsCollectionIndexMessages(
  messages: UiMessages,
  definition: DocsCollectionDefinition,
): DocsCollectionIndexMessages {
  const { index } = definition.messageKeys;

  return {
    title: resolveUiMessagePath(messages, index.title),
    description: resolveUiMessagePath(messages, index.description),
    listLabel: resolveUiMessagePath(messages, index.listLabel),
    emptyTitle: resolveUiMessagePath(messages, index.emptyTitle),
    emptyDescription: resolveUiMessagePath(messages, index.emptyDescription),
    emptyHomeLink: resolveUiMessagePath(messages, index.emptyHomeLink),
  };
}
