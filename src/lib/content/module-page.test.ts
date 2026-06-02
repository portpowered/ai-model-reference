import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pageMessagesSchema } from "@/lib/content/schemas";

const messagesPath = join(
  process.cwd(),
  "src/content/docs/modules/grouped-query-attention/messages/en.json",
);

describe("grouped-query-attention page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Grouped-Query Attention");
    expect(messages.problemStatement?.length).toBeGreaterThan(0);
    expect(messages.coreIdea?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItOptimizes.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
  });
});
