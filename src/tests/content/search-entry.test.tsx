import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SearchEntryPage from "@/app/(site)/search/page";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("search entry page messages", () => {
  it("loads localized title, description, and canonical path copy", () => {
    const { searchEntry } = loadUiMessages();
    expect(searchEntry.title).toBe("Search");
    expect(searchEntry.description.length).toBeGreaterThan(0);
    expect(searchEntry.canonicalNote).toContain("/search");
    expect(searchEntry.canonicalNote).toContain("?q=");
    expect(searchEntry.tagFilterDescription).toContain("{tag}");
    expect(searchEntry.emptySuggestionGqa).toBe("GQA");
    expect(
      searchEntry.emptySuggestionAttentionLinkLabel.length,
    ).toBeGreaterThan(0);
  });
});

describe("search entry page render", () => {
  it("renders accessible heading and inline search input fallback", async () => {
    const html = renderToStaticMarkup(await SearchEntryPage());
    expect(html).toContain("Search");
    expect(html).toContain("/search");
    expect(html).toContain("Search Model Atlas");
    expect(html).not.toContain("lorem");
    expect(html).not.toContain("placeholder");
  });
});
