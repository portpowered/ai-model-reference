import { describe, expect, it } from "bun:test";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("loadUiMessages shell keys", () => {
  it("loads shell copy for the docs layout", async () => {
    const messages = await loadUiMessages();
    expect(messages.shell.sidebarTitle.length).toBeGreaterThan(0);
    expect(messages.nav.home).toBe("Home");
    expect(messages.nav.search).toBe("Search");
    expect(messages.nav.architecture).toBe("Architecture");
    expect(messages.searchEntry.title).toBe("Search");
    expect(messages.architectureIndex.title).toBe("Architecture");
    expect(messages.glossaryIndex.title).toBe("Glossary");
    expect(messages.tagsIndex.title).toBe("Tags");
  });
});
