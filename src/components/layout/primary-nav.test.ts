import { describe, expect, it } from "bun:test";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_LINK_CLASS,
  PRIMARY_NAV_MOBILE_LINK_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
  PRIMARY_NAV_MOBILE_PANEL_CLASS,
} from "@/components/layout/primary-nav";
import type { TopologyNavigationOption } from "@/lib/content/topology-navigation";
import { loadUiMessages } from "@/lib/content/ui-messages";
import type { SiteConfig } from "@/lib/site/site-config.contract";

describe("getPrimaryNavItems", () => {
  it("lists Phase 1 discovery routes in order", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages);

    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/topology",
      "/docs/timeline",
      "/tags",
    ]);
    expect(items.map((item) => item.label)).toEqual([
      messages.nav.home,
      messages.nav.topology,
      messages.nav.timeline,
      messages.nav.tags,
    ]);
  });

  it("can emit vietnamese-prefixed navigation routes from the shared locale contract", async () => {
    const messages = await loadUiMessages("vi");
    const items = getPrimaryNavItems(messages, "vi");

    expect(items.map((item) => item.href)).toEqual([
      "/vi",
      "/vi/topology",
      "/vi/docs/timeline",
      "/vi/tags",
    ]);
    expect(items.map((item) => item.label)).toEqual([
      messages.nav.home,
      messages.nav.topology,
      messages.nav.timeline,
      messages.nav.tags,
    ]);
    expect(items.map((item) => item.label)).toEqual([
      "Trang chủ",
      messages.nav.topology,
      "Dòng thời gian",
      messages.nav.tags,
    ]);
  });

  it("omits duplicate /search link from primary navigation", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages);

    expect(items.some((item) => item.href === "/search")).toBe(false);
  });

  it("builds ordered items from configured primary nav entries", async () => {
    const messages = await loadUiMessages();
    const customConfig = {
      brand: {
        scaffoldId: "example-scaffold",
        brandName: "Example Atlas",
        siteHeading: "Example Reference",
      },
      repositoryUrl: "https://github.com/example/example",
      routeSurfaces: {
        home: { surface: "home" },
        browse: { surface: "browse" },
        topology: { surface: "topology" },
        timeline: { surface: "docs-page", slug: "timeline" },
        tagsIndex: { surface: "tags-index" },
      },
      homeRouteSurface: "home",
      primaryNav: [
        { routeSurface: "tagsIndex", labelKey: "tags" },
        { routeSurface: "home", labelKey: "home" },
      ],
      collections: [{ id: "guides" }],
      homeFeaturedLinks: [],
    } satisfies SiteConfig;

    const items = getPrimaryNavItems(messages, "en", {
      siteConfig: customConfig,
    });

    expect(items.map((item) => item.href)).toEqual(["/tags", "/"]);
    expect(items.map((item) => item.label)).toEqual([
      messages.nav.tags,
      messages.nav.home,
    ]);
  });

  it("accepts topologyOptions without adding extra nav items", async () => {
    const messages = await loadUiMessages();
    const defaultItems = getPrimaryNavItems(messages);
    const withTopologyOptions = getPrimaryNavItems(messages, "en", {
      topologyOptions: [
        { classificationId: "classification.example" },
      ] as TopologyNavigationOption[],
    });

    expect(withTopologyOptions).toEqual(defaultItems);
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
    expect(PRIMARY_NAV_MOBILE_LINK_CLASS).toContain("focus-visible:ring-ring");
  });
});
