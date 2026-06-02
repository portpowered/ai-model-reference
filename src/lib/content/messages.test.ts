import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  MessageLoadError,
  groupedQueryAttentionPageDir,
  loadPageMessages,
  tokenGlossaryPageDir,
} from "./messages";

const validMessages = {
  title: "Grouped-Query Attention",
  description: "An attention variant that reduces KV cache memory.",
  problemStatement: "KV caches get expensive as context length grows.",
  coreIdea: "GQA lets several query heads share fewer key-value heads.",
  sections: {
    whatItIs: {
      title: "What It Is",
      body: "Grouped-query attention is an attention variant derived from multi-head attention.",
    },
  },
};

describe("loadPageMessages", () => {
  test("loads baseline grouped-query-attention messages for locale en", async () => {
    const messages = await loadPageMessages(groupedQueryAttentionPageDir, "en");

    expect(messages.title).toBe("Grouped-Query Attention");
    expect(messages.description).toContain("reduces KV cache memory");
    expect(messages.sections?.whatItIs?.title).toBe("What It Is");
    expect(messages.sections?.whatItIs?.body).toContain(
      "Grouped-query attention",
    );
  });

  test("loads baseline token glossary messages for locale en", async () => {
    const messages = await loadPageMessages(tokenGlossaryPageDir, "en");

    expect(messages.title).toBe("Token");
    expect(messages.description).toContain("smallest unit");
    expect(messages.sections?.whatItIs?.body).toContain("vocabulary");
    expect(messages.sections?.whyItMatters?.body).toContain("Tokenization");
  });
});

describe("loadPageMessages errors", () => {
  const tempPageDir = join(import.meta.dir, "__fixtures__", "page-messages");

  afterEach(async () => {
    await rm(tempPageDir, { recursive: true, force: true });
  });

  async function writeMessagesFixture(
    locale: string,
    content: string | Record<string, unknown>,
  ) {
    const messagesDir = join(tempPageDir, "messages");
    await rm(tempPageDir, { recursive: true, force: true });
    await mkdir(messagesDir, { recursive: true });
    const body =
      typeof content === "string" ? content : JSON.stringify(content);
    await writeFile(join(messagesDir, `${locale}.json`), body);
  }

  test("throws a clear error when the default locale en file is missing", async () => {
    await mkdir(join(tempPageDir, "messages"), { recursive: true });

    await expect(loadPageMessages(tempPageDir, "en")).rejects.toMatchObject({
      name: "MessageLoadError",
      message: expect.stringContaining(
        "Missing required default locale messages file",
      ),
      details: [
        expect.objectContaining({
          type: "missing-file",
          locale: "en",
        }),
      ],
    });
  });

  test("throws when messages fail schema validation", async () => {
    await writeMessagesFixture("en", {
      title: "",
      description: "",
    });

    await expect(loadPageMessages(tempPageDir, "en")).rejects.toMatchObject({
      name: "MessageLoadError",
      message: expect.stringContaining("schema validation failed"),
    });
  });

  test("throws when messages JSON is invalid", async () => {
    await writeMessagesFixture("en", "{ not-json");

    await expect(loadPageMessages(tempPageDir, "en")).rejects.toBeInstanceOf(
      MessageLoadError,
    );
  });

  test("loads valid messages from a custom page directory fixture", async () => {
    await writeMessagesFixture("en", validMessages);
    const messages = await loadPageMessages(tempPageDir, "en");
    expect(messages.title).toBe(validMessages.title);
    expect(messages.sections?.whatItIs?.body).toBe(
      validMessages.sections.whatItIs.body,
    );
  });
});
