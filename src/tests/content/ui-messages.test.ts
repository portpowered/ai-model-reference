import { describe, expect, it } from "bun:test";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("loadUiMessages home keys", () => {
  it("loads home reference copy for the entry page", () => {
    const messages = loadUiMessages();
    expect(messages.home.title).toBe("Model Atlas");
    expect(messages.home.glossaryLinkTitle.length).toBeGreaterThan(0);
    expect(messages.shell.sidebarTitle.length).toBeGreaterThan(0);
  });
});
