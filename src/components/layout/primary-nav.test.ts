import { describe, expect, it } from "bun:test";
import {
  getPrimaryNavItems,
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_LINK_CLASS,
  PRIMARY_NAV_MOBILE_LINK_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
  PRIMARY_NAV_MOBILE_PANEL_CLASS,
} from "@/components/layout/primary-nav";
import {
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
} from "@/lib/content/topology-navigation";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("getPrimaryNavItems", () => {
  it("lists Phase 1 discovery routes in order", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages);

    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/docs/architecture",
      "/topology",
      "/docs/glossary",
      "/docs/timeline",
      "/tags",
    ]);
    expect(items.map((item) => item.label)).toEqual([
      messages.nav.home,
      messages.nav.architecture,
      messages.nav.topology,
      messages.nav.glossary,
      messages.nav.timeline,
      messages.nav.tags,
    ]);
  });

  it("can emit vietnamese-prefixed navigation routes from the shared locale contract", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages, "vi");

    expect(items.map((item) => item.href)).toEqual([
      "/vi",
      "/vi/docs/architecture",
      "/vi/topology",
      "/vi/docs/glossary",
      "/vi/docs/timeline",
      "/vi/tags",
    ]);
  });

  it("appends topology graph map and timeline routes from derived seed classifications", async () => {
    const messages = await loadUiMessages();
    const topologyOptions = listTopologyNavigationOptions();
    const items = getPrimaryNavItems(messages, "en", { topologyOptions });

    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/docs/architecture",
      "/browse?classification=activation-functions&mode=graph-map",
      "/browse?classification=activation-functions&mode=timeline",
      "/browse?classification=feed-forward-networks&mode=graph-map",
      "/browse?classification=feed-forward-networks&mode=timeline",
      "/topology",
      "/docs/glossary",
      "/docs/timeline",
      "/tags",
    ]);
    expect(items.map((item) => item.label)).toEqual([
      messages.nav.home,
      messages.nav.architecture,
      "Activation Functions Graph map",
      "Activation Functions Timeline",
      "Feed Forward Networks Graph map",
      "Feed Forward Networks Timeline",
      messages.nav.topology,
      messages.nav.glossary,
      messages.nav.timeline,
      messages.nav.tags,
    ]);
  });

  it("keeps legacy-only navigation when no topology classifications are eligible", async () => {
    const messages = await loadUiMessages();
    const items = getPrimaryNavItems(messages, "en", { topologyOptions: [] });

    expect(items.map((item) => item.href)).toEqual([
      "/",
      "/docs/architecture",
      "/topology",
      "/docs/glossary",
      "/docs/timeline",
      "/tags",
    ]);
  });

  it("localizes topology routes through the derived navigation options", async () => {
    const messages = await loadUiMessages("vi");
    const topologyOptions = listTopologyNavigationOptions({
      locale: "vi",
      labels: getTopologyNavigationLabels(messages),
    });
    const items = getPrimaryNavItems(messages, "vi", { topologyOptions });

    expect(items.map((item) => item.href)).toContain(
      "/vi/browse?classification=activation-functions&mode=graph-map",
    );
    expect(items.map((item) => item.href)).toContain(
      "/vi/browse?classification=feed-forward-networks&mode=timeline",
    );
    expect(items.map((item) => item.label)).toContain(
      "Bản đồ đồ thị Hàm kích hoạt",
    );
    expect(items.map((item) => item.label)).toContain(
      "Dòng thời gian Mạng feed-forward",
    );
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
    expect(PRIMARY_NAV_MOBILE_LINK_CLASS).toContain("focus-visible:ring-ring");
  });
});
