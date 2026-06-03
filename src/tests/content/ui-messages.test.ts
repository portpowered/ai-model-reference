import { describe, expect, it } from "bun:test";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("loadUiMessages shell keys", () => {
  it("loads shell copy for the docs layout", () => {
    const messages = loadUiMessages();
    expect(messages.shell.sidebarTitle.length).toBeGreaterThan(0);
    expect(messages.nav.home).toBe("Home");
  });
});
