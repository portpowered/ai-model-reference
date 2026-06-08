import "@/tests/a11y/mock-navigation";
import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SearchEntryPage from "@/app/(site)/search/page";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { assertSearchPageExportShell } from "@/lib/verify/phase-1-search-export-shell-checks";

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
    expect(assertSearchPageExportShell(html)).toBeNull();
  });
});
