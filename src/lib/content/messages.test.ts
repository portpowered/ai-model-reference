import { describe, expect, test } from "bun:test";
import fixture from "@/lib/content/__fixtures__/page-messages.json";
import {
  MissingMessageKeyError,
  lookupMessage,
  resolveMessage,
} from "@/lib/content/messages";
import type { PageMessages } from "@/lib/content/schemas";

const messages = fixture as PageMessages;

describe("lookupMessage", () => {
  test("resolves top-level keys", () => {
    expect(lookupMessage(messages, "title")).toEqual({
      ok: true,
      value: "Grouped-Query Attention",
    });
  });

  test("resolves nested section keys with dot paths", () => {
    expect(lookupMessage(messages, "sections.whatItIs.title")).toEqual({
      ok: true,
      value: "What It Is",
    });
    expect(lookupMessage(messages, "sections.whatItIs.body")).toEqual({
      ok: true,
      value:
        "Grouped-query attention is an attention variant derived from multi-head attention.",
    });
  });

  test("reports missing keys", () => {
    expect(lookupMessage(messages, "sections.missingSection.title")).toEqual({
      ok: false,
      key: "sections.missingSection.title",
      reason: "missing",
    });
  });

  test("reports empty string values as empty", () => {
    const sparse: PageMessages = {
      title: "",
      description: "Has description",
    };
    expect(lookupMessage(sparse, "title")).toEqual({
      ok: false,
      key: "title",
      reason: "empty",
    });
  });
});

describe("resolveMessage", () => {
  test("returns the resolved string", () => {
    expect(resolveMessage(messages, "coreIdea")).toBe(
      "GQA lets several query heads share fewer key-value heads.",
    );
  });

  test("throws MissingMessageKeyError for missing keys", () => {
    expect(() => resolveMessage(messages, "sections.unknown.body")).toThrow(
      MissingMessageKeyError,
    );
  });
});
