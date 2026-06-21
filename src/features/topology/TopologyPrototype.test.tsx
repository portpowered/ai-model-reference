import "@/tests/a11y/mock-navigation";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  getMockRouter,
  resetMockNavigation,
  setMockPathname,
  setMockSearchParams,
} from "@/tests/a11y/mock-navigation";
import { TopologyPrototype } from "./TopologyPrototype";
import type { TopologyDocsPageContentByRegistryId } from "./topology-content";
import {
  buildTopologyGraph,
  DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS,
} from "./topology-data";

const docsPageContentByRegistryId: TopologyDocsPageContentByRegistryId = {
  "concept.activation": {
    href: "/docs/glossary/activation",
    summary:
      "A nonlinear step that lets neural networks respond differently to different inputs.",
    title: "Activation",
  },
  "module.relu": {
    href: "/docs/modules/relu",
    summary:
      "A simple activation function that keeps positive values and turns negative values into zero.",
    title: "Rectified Linear Unit",
  },
  "module.leaky-relu": {
    href: "/docs/modules/leaky-relu",
    summary:
      "A ReLU variant that preserves a small negative slope instead of clamping every negative value to zero.",
    title: "Leaky Rectified Linear Unit",
  },
  "module.silu": {
    href: "/docs/modules/silu",
    summary:
      "A smooth activation that scales each value by its own sigmoid gate.",
    title: "Sigmoid Linear Unit",
  },
  "module.swiglu": {
    href: "/docs/modules/swiglu",
    summary:
      "A gated feed-forward activation that uses SiLU on one branch before multiplying with a learned gate.",
    title: "SwiGLU",
  },
  "module.standard-ffn": {
    href: "/docs/modules/standard-ffn",
    summary:
      "The standard transformer feed-forward block expands the hidden state, applies an activation, then projects back down.",
    title: "Standard Feed-Forward Network",
  },
  "module.feed-forward-network": {
    href: "/docs/modules/feed-forward-network",
    summary:
      "A feed-forward network maps inputs to outputs through stacked affine transforms and nonlinearities.",
    title: "Feed-Forward Network",
  },
};

describe("TopologyPrototype", () => {
  afterEach(() => {
    cleanup();
    resetMockNavigation();
  });

  test("renders a Cytoscape-backed topology viewport with controls and accessible graph lists", async () => {
    const messages = await loadUiMessages();
    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams());

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    expect(
      screen.getByRole("img", { name: messages.topologyPrototype.graphLabel }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: messages.topologyPrototype.fitGraphLabel,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: messages.topologyPrototype.resetGraphLabel,
      }),
    ).toBeTruthy();
    expect(screen.getByText("SwiGLU -> uses -> SiLU")).toBeTruthy();
    expect(
      screen
        .getByRole("button", {
          name: messages.topologyPrototype.activationChip,
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", {
          name: messages.topologyPrototype.activationFunctionChip,
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", {
          name: messages.topologyPrototype.feedForwardChip,
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  test("reads classification chip state from the URL and updates the URL when chips change", async () => {
    const messages = await loadUiMessages();
    const user = userEvent.setup();
    const router = getMockRouter();

    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams("classification=feed-forward"));

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    expect(
      screen
        .getByRole("button", {
          name: messages.topologyPrototype.feedForwardChip,
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", {
          name: messages.topologyPrototype.activationChip,
        })
        .getAttribute("aria-pressed"),
    ).toBe("false");

    await user.click(
      screen.getByRole("button", {
        name: messages.topologyPrototype.activationChip,
      }),
    );

    expect(router.push).toHaveBeenCalledWith(
      "/topology?classification=feed-forward&classification=activation",
    );
  });

  test("renders a recoverable empty state for explicit empty selections", async () => {
    const messages = await loadUiMessages();

    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams("classification="));

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    expect(
      screen.getAllByText(messages.topologyPrototype.emptyTitle).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(messages.topologyPrototype.emptyNoSelectionDescription),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: messages.topologyPrototype.emptyReturnAction,
      }),
    ).toBeTruthy();
  });

  test("renders a named empty state for valid classifications without visible members", async () => {
    const messages = await loadUiMessages();

    setMockPathname("/topology");
    setMockSearchParams(
      new URLSearchParams("classification=neural-network-components"),
    );

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    expect(
      screen.getAllByText(messages.topologyPrototype.emptyTitle).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Selected classification: neural-network-components."),
    ).toBeTruthy();
  });

  test("renders invalid classification recovery state from the URL", async () => {
    const messages = await loadUiMessages();

    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams("classification=missing-slice"));

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    expect(
      screen.getAllByText(messages.topologyPrototype.errorTitle).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Invalid classification: missing-slice."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: messages.topologyPrototype.errorReturnAction,
      }),
    ).toBeTruthy();
  });

  test("shows record details with localized summary and canonical docs link when a node is selected", async () => {
    const messages = await loadUiMessages();
    const user = userEvent.setup();

    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams());

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    await user.click(screen.getByRole("button", { name: "ReLU" }));

    expect(screen.getByText("Rectified Linear Unit")).toBeTruthy();
    expect(
      screen.getByText(
        "A simple activation function that keeps positive values and turns negative values into zero.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("activation function").length).toBeGreaterThan(
      0,
    );
    const canonicalLinks = screen.getAllByRole("link", {
      name: messages.topologyPrototype.detailOpenCanonicalPage,
    });

    expect(canonicalLinks.at(-1)?.getAttribute("href")).toBe(
      "/docs/modules/relu",
    );
  });

  test("shows classification scope and visible member count when a classification node is selected", async () => {
    const messages = await loadUiMessages();
    const user = userEvent.setup();
    const graph = buildTopologyGraph(DEFAULT_TOPOLOGY_CLASSIFICATION_SELECTORS);

    if (graph.status === "error") {
      throw new Error("Expected default topology graph to build successfully.");
    }

    const visibleMemberCount = graph.edges.filter(
      (edge) =>
        edge.kind === "membership" &&
        edge.sourceId === "classification.activation-functions",
    ).length;

    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams());

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "activation function",
      }),
    );

    expect(
      screen.getByText(messages.topologyPrototype.detailLabelScope),
    ).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.classificationTypeFamily),
    ).toBeTruthy();
    expect(screen.getByText(String(visibleMemberCount))).toBeTruthy();
  });

  test("shows relationship source and target details when a relationship is selected", async () => {
    const messages = await loadUiMessages();
    const user = userEvent.setup();

    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams());

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "SwiGLU -> uses -> SiLU" }),
    );

    expect(
      screen.getByText(messages.topologyPrototype.detailLabelRelationship),
    ).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.detailLabelSource),
    ).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.detailLabelTarget),
    ).toBeTruthy();
    expect(screen.getAllByText("SwiGLU").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SiLU").length).toBeGreaterThan(0);
  });
});
