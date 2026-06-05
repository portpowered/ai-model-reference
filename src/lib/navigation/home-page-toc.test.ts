import { describe, expect, test } from "bun:test";

import { loadUiMessages } from "@/lib/content/ui-messages";

import { buildHomeTableOfContents } from "./home-page-toc";

describe("buildHomeTableOfContents", () => {
  test("lists Browse only and omits the removed #search anchor", async () => {
    const { home } = await loadUiMessages();
    const toc = buildHomeTableOfContents(home);

    expect(toc).toEqual([
      {
        title: "Browse",
        url: "#browse",
        depth: 2,
      },
    ]);
    expect(toc.some((item) => item.url === "#search")).toBe(false);
  });
});
