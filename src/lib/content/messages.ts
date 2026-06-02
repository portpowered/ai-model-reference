import type { PageMessages } from "@/lib/content/schemas";

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
