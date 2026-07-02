import { describe, expect, test } from "bun:test";
import { loadUiMessages } from "@/lib/content/ui-messages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  DOCS_COLLECTION_IDS,
  type DocsCollectionMessageKeys,
} from "@/lib/docs/collection-definition-contract";
import { assertDocsCollectionDefinitionInventoryVerified } from "@/lib/docs/docs-collection-definition-inventory-verification";
import { listDocsCollectionDefinitions } from "@/lib/docs/docs-collection-definitions";

function resolveUiMessagePath(messages: UiMessages, path: string): string {
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

function expectResolvableMessageKeys(
  messages: UiMessages,
  messageKeys: DocsCollectionMessageKeys,
): void {
  for (const path of [
    messageKeys.browse.sectionTitle,
    messageKeys.browse.sectionDescription,
    messageKeys.browse.sectionLinkLabel,
    messageKeys.index.title,
    messageKeys.index.description,
    messageKeys.index.listLabel,
    messageKeys.index.emptyTitle,
    messageKeys.index.emptyDescription,
    messageKeys.index.emptyHomeLink,
  ]) {
    expect(resolveUiMessagePath(messages, path).length).toBeGreaterThan(0);
  }
}

describe("docs collection definition inventory verification", () => {
  test("assertDocsCollectionDefinitionInventoryVerified passes for current inventory", () => {
    expect(() =>
      assertDocsCollectionDefinitionInventoryVerified(),
    ).not.toThrow();
  });

  test("inventory includes every current AI collection exactly once", () => {
    assertDocsCollectionDefinitionInventoryVerified();

    expect(
      listDocsCollectionDefinitions().map((definition) => definition.id),
    ).toEqual([...DOCS_COLLECTION_IDS]);
  });

  test("message key metadata resolves to localized copy", async () => {
    assertDocsCollectionDefinitionInventoryVerified();

    const messages = await loadUiMessages();
    for (const definition of listDocsCollectionDefinitions()) {
      expectResolvableMessageKeys(messages, definition.messageKeys);
    }
  });
});
