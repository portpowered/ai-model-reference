import { describe, expect, it } from "bun:test";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_LINK_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
  PRIMARY_NAV_MOBILE_PANEL_CLASS,
} from "@/components/layout/primary-nav";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("getPrimaryNavItems", () => {
  it("lists Phase 1 discovery routes in order", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages);

    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/docs/architecture",
      "/docs/glossary",
      "/tags",
    ]);
    expect(items.map((item) => item.label)).toEqual([
      messages.nav.home,
      messages.nav.architecture,
      messages.nav.glossary,
      messages.nav.tags,
    ]);
  });

  it("can emit vietnamese-prefixed navigation routes from the shared locale contract", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages, "vi");

    expect(items.map((item) => item.href)).toEqual([
      "/vi",
      "/vi/docs/architecture",
      "/vi/docs/glossary",
      "/vi/tags",
    ]);
  });

  it("omits duplicate /search link from primary navigation", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages);

    expect(items.some((item) => item.href === "/search")).toBe(false);
  });

  it("uses ring token focus styles on nav links", () => {
    expect(PRIMARY_NAV_LINK_CLASS).toContain("focus-visible:ring-ring");
  });

  it("exports responsive header class contracts", () => {
    expect(PRIMARY_NAV_DESKTOP_CLASS).toContain("hidden");
    expect(PRIMARY_NAV_DESKTOP_CLASS).toContain("md:flex");
    expect(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS).toBe("md:hidden");
    expect(PRIMARY_NAV_MOBILE_PANEL_CLASS).toContain("order-last");
    expect(PRIMARY_NAV_MOBILE_PANEL_CLASS).toContain("w-full");
    expect(PRIMARY_NAV_MOBILE_PANEL_CLASS).toContain("md:hidden");
  });
});
