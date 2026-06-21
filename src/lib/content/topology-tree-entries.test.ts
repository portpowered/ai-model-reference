import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages, loadShippedLocalizedDocsPages } from "./pages";
import {
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
} from "./topology-navigation";
import { buildTopologyTreeEntries } from "./topology-tree-entries";
import { loadUiMessages } from "./ui-messages";

describe("topology tree entries", () => {
  test("builds the migrated activation branch from generated runtime data with localized classification labels", async () => {
    const messages = await loadUiMessages("vi");
    const topologyLabels = getTopologyNavigationLabels(messages);
    const options = listTopologyNavigationOptions({
      locale: "vi",
      labels: topologyLabels,
    });
    const activation = options.find(
      (option) => option.classificationSlug === "activation-functions",
    );

    expect(activation).toBeDefined();
    if (!activation) {
      return;
    }

    const tree = buildTopologyTreeEntries({
      tree: activation.tree,
      localizedPages: await loadShippedLocalizedDocsPages("vi"),
      canonicalPages: await loadPublishedDocsPages("en"),
      locale: "vi",
      topologyLabels,
    });

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      classificationId: "classification.activation-functions",
      title: "Hàm kích hoạt",
      directMemberCount: activation.memberCount,
      totalMemberCount: activation.memberCount,
    });
    expect(
      tree[0]?.children.every((child) => child.nodeType === "record"),
    ).toBe(true);

    const relu = tree[0]?.children.find(
      (child) =>
        child.nodeType === "record" && child.registryId === "module.relu",
    );

    expect(relu).toMatchObject({
      nodeType: "record",
      registryId: "module.relu",
      title: "Rectified Linear Unit",
      url: "/docs/modules/relu",
      membershipType: "primary",
    });
    if (relu?.nodeType === "record") {
      expect(relu.summary).toContain("keeps positive values");
    }
  });

  test("falls back to slug-derived titles when page metadata is unavailable", async () => {
    const messages = await loadUiMessages();
    const topologyLabels = getTopologyNavigationLabels(messages);
    const options = listTopologyNavigationOptions({
      labels: topologyLabels,
    });
    const feedForward = options.find(
      (option) => option.classificationSlug === "feed-forward-networks",
    );

    expect(feedForward).toBeDefined();
    if (!feedForward) {
      return;
    }

    const tree = buildTopologyTreeEntries({
      tree: feedForward.tree,
      localizedPages: [],
      canonicalPages: [],
      locale: "en",
      topologyLabels,
    });

    const feedForwardNetwork = tree[0]?.children.find(
      (child) =>
        child.nodeType === "record" &&
        child.registryId === "module.feed-forward-network",
    );

    expect(feedForwardNetwork).toMatchObject({
      nodeType: "record",
      registryId: "module.feed-forward-network",
      title: "Feed Forward Network",
      summary: "Feed Forward Network",
      url: "/docs/modules/feed-forward-network",
      membershipType: "primary",
    });
  });
});
