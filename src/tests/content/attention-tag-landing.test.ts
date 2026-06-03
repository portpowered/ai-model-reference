import { describe, expect, it } from "bun:test";
import {
  groupTagResourceEntriesByKind,
  loadTagLandingContext,
  loadTagResourceEntries,
  loadTagResourceGroups,
} from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("attention tag landing resources", () => {
  it("loads the attention tag record with localized title and summary", () => {
    const messages = loadUiMessages();
    const context = loadTagLandingContext("attention", messages, "en");

    expect(context).toBeDefined();
    expect(context?.title).toBe("Attention");
    expect(context?.summary.length).toBeGreaterThan(0);
    expect(context?.categoryLabel).toBe("Architecture");
  });

  it("includes the grouped-query attention module under modules", () => {
    const messages = loadUiMessages();
    const entries = loadTagResourceEntries("attention", "en");
    const moduleEntry = entries.find(
      (entry) => entry.url === "/docs/modules/grouped-query-attention",
    );

    expect(moduleEntry).toBeDefined();
    expect(moduleEntry?.kind).toBe("module");
    expect(moduleEntry?.title).toBe("Grouped-Query Attention");

    const groups = loadTagResourceGroups("attention", messages, "en");
    const moduleGroup = groups.find((group) => group.kind === "module");

    expect(moduleGroup).toBeDefined();
    expect(moduleGroup?.kindLabel).toBe("Module");
    expect(moduleGroup?.resources.map((resource) => resource.url)).toEqual([
      "/docs/modules/grouped-query-attention",
    ]);
  });

  it("omits empty kind groups and groups module and glossary resources separately", () => {
    const messages = loadUiMessages();
    const groups = loadTagResourceGroups("attention", messages, "en");

    expect(groups.every((group) => group.resources.length > 0)).toBe(true);
    expect(groups.map((group) => group.kind)).toEqual(["module", "glossary"]);

    const glossaryGroup = groups.find((group) => group.kind === "glossary");
    expect(glossaryGroup?.resources[0]?.url).toBe("/docs/glossary/token");
  });

  it("sorts resources alphabetically by title within a kind group", () => {
    const messages = loadUiMessages();
    const groups = groupTagResourceEntriesByKind(
      [
        {
          title: "Zebra Module",
          summary: "Later alphabetically",
          url: "/docs/modules/zebra",
          slug: "zebra",
          kind: "module",
        },
        {
          title: "Alpha Module",
          summary: "Earlier alphabetically",
          url: "/docs/modules/alpha",
          slug: "alpha",
          kind: "module",
        },
      ],
      messages,
    );

    expect(groups[0]?.resources.map((resource) => resource.title)).toEqual([
      "Alpha Module",
      "Zebra Module",
    ]);
  });
});

describe("tag landing messages", () => {
  it("loads localized copy for tag landing pages", () => {
    const messages = loadUiMessages();
    expect(messages.tagLanding.listLabel.length).toBeGreaterThan(0);
    expect(messages.tagLanding.searchHandoff.length).toBeGreaterThan(0);
    expect(messages.tagLanding.emptyTitle.length).toBeGreaterThan(0);
  });
});
