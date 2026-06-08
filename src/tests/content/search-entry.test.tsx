import "@/tests/a11y/mock-navigation";
import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SearchEntryPage from "@/app/(site)/search/page";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { PLACEHOLDER_SIDEBAR_DESCRIPTION } from "@/lib/navigation/docs-sidebar-contract";

describe("search entry page messages", () => {
  it("loads localized title, description, and canonical path copy", async () => {
    const { searchEntry } = await loadUiMessages();
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
  it("renders accessible heading and inline search input shell", async () => {
    const html = renderToStaticMarkup(await SearchEntryPage());
    expect(html).toContain("Search");
    expect(html).toContain("/search");
    expect(html).toContain("Search Model Atlas");
    expect(html).toContain('id="search-page-input"');
    expect(html).toContain('data-testid="search-page-idle"');
    expect(html).not.toContain('aria-hidden="true"><span>');
    expect(html).not.toContain("lorem");
    expect(html).not.toContain(PLACEHOLDER_SIDEBAR_DESCRIPTION);
  });
});
