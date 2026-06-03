import { describe, expect, it } from "bun:test";
import { loadUiMessages } from "@/lib/content/ui-messages";

/** Browse targets on `/` must stay aligned with Phase 1 discovery routes. */
const HOME_BROWSE_HREFS = [
  "/docs/architecture",
  "/docs/glossary",
  "/tags",
  "/docs/modules/grouped-query-attention",
] as const;

describe("home page messages", () => {
  it("loads localized copy for title, search, and browse sections", () => {
    const { home } = loadUiMessages();
    expect(home.title).toBe("Model Atlas");
    expect(home.subtitle.length).toBeGreaterThan(0);
    expect(home.intro.length).toBeGreaterThan(0);
    expect(home.searchSectionTitle.length).toBeGreaterThan(0);
    expect(home.browseSectionTitle.length).toBeGreaterThan(0);
    expect(home.architectureLinkTitle).toBe("Architecture");
    expect(home.glossaryLinkTitle).toBe("Glossary");
    expect(home.tagsLinkTitle).toBe("Tags");
    expect(home.docsLinkTitle.length).toBeGreaterThan(0);
  });

  it("defines browse link titles for every Phase 1 discovery index", () => {
    const { home } = loadUiMessages();
    expect(home.architectureLinkDescription.length).toBeGreaterThan(0);
    expect(home.glossaryLinkDescription.length).toBeGreaterThan(0);
    expect(home.tagsLinkDescription.length).toBeGreaterThan(0);
    expect(home.docsLinkDescription.length).toBeGreaterThan(0);
    expect(HOME_BROWSE_HREFS).toHaveLength(4);
  });
});
