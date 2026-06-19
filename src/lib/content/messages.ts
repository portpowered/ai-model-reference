import type { PageMessages } from "./schemas";

export type MissingMessageReason = "missing" | "empty";

export type MessageLookupResult =
  | { ok: true; value: string }
  | { ok: false; key: string; reason: MissingMessageReason };

export class MissingMessageKeyError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`Missing message key: ${key}`);
    this.name = "MissingMessageKeyError";
    this.key = key;
  }
}

function getNestedValue(root: unknown, key: string): unknown {
  const segments = key.split(".");
  let current: unknown = root;

  for (const segment of segments) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function lookupMessage(
  messages: PageMessages,
  key: string,
): MessageLookupResult {
  const value = getNestedValue(messages, key);

  if (value === undefined || value === null) {
    return { ok: false, key, reason: "missing" };
  }

  if (typeof value !== "string") {
    return { ok: false, key, reason: "missing" };
  }

  if (value.length === 0) {
    return { ok: false, key, reason: "empty" };
  }

  return { ok: true, value };
}

export function resolveMessage(messages: PageMessages, key: string): string {
  const result = lookupMessage(messages, key);
  if (result.ok) {
    return result.value;
  }
  throw new MissingMessageKeyError(key);
}

export function formatMissingMessageKey(
  key: string,
  reason: MissingMessageReason,
): string {
  const detail = reason === "empty" ? " (empty string)" : "";
  return `Missing message key: ${key}${detail}`;
}

/** Collects searchable body text from resolved page messages (not raw MDX). */
export function collectMessageBodyText(messages: PageMessages): string {
  const parts: string[] = [
    messages.title,
    messages.description,
  ];

  if (messages.sections) {
    for (const section of Object.values(messages.sections)) {
      parts.push(section.title, section.body ?? "");
    }
  }

  if (messages.callouts) {
    for (const callout of Object.values(messages.callouts)) {
      parts.push(callout.title ?? "", callout.body);
    }
  }

  if (messages.links) {
    for (const label of Object.values(messages.links)) {
      parts.push(label);
    }
  }

  if (messages.assets) {
    for (const asset of Object.values(messages.assets)) {
      parts.push(asset.alt ?? "", asset.caption ?? "");
    }
  }

  return parts.filter(Boolean).join("\n");
}

/** Collects section headings from resolved page messages. */
export function collectMessageHeadings(messages: PageMessages): string[] {
  const headings = [messages.title];
  if (messages.sections) {
    for (const section of Object.values(messages.sections)) {
      headings.push(section.title);
    }
  }
  return headings;
}
