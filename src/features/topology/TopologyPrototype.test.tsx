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

  test("renders a quieter Cytoscape-backed topology viewport", async () => {
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
    expect(
      screen.getByRole("button", {
        name: messages.topologyPrototype.clearSelectionLabel,
      }),
    ).toBeTruthy();
    expect(
      screen.queryByText(messages.topologyPrototype.loadingTitle),
    ).toBeNull();
    expect(
      screen.queryByText(messages.topologyPrototype.emptyTitle),
    ).toBeNull();
    expect(
      screen.queryByText(messages.topologyPrototype.errorTitle),
    ).toBeNull();
    expect(
      screen.queryByText(messages.topologyPrototype.accessibleNodeListTitle),
    ).toBeNull();
    expect(
      screen.queryByText(
        messages.topologyPrototype.accessibleRelationshipListTitle,
      ),
    ).toBeNull();
    expect(
      screen.queryByText(messages.topologyPrototype.legendTitle),
    ).toBeNull();
    expect(
      screen.getByRole("link", {
        name: messages.topologyBrowse.classificationLabels.activationFunctions,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: messages.topologyBrowse.classificationLabels.feedForwardNetworks,
      }),
    ).toBeTruthy();
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
        .getByRole("link", {
          name: messages.topologyBrowse.classificationLabels
            .feedForwardNetworks,
        })
        .getAttribute("href"),
    ).toBe("/topology?classification=");
    expect(
      screen
        .getByRole("link", {
          name: messages.topologyBrowse.classificationLabels
            .activationFunctions,
        })
        .getAttribute("href"),
    ).toBe(
      "/topology?classification=feed-forward&classification=activation-functions",
    );

    await user.click(
      screen.getByRole("link", {
        name: messages.topologyBrowse.classificationLabels.activationFunctions,
      }),
    );

    expect(router.push).toHaveBeenCalledWith(
      "/topology?classification=feed-forward&classification=activation-functions",
    );
  });

  test("treats canonical classification ids in the URL as the same active selection", async () => {
    const messages = await loadUiMessages();

    setMockPathname("/topology");
    setMockSearchParams(
      new URLSearchParams("classification=classification.module.feed-forward"),
    );

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    expect(
      screen
        .getByRole("link", {
          name: messages.topologyBrowse.classificationLabels
            .feedForwardNetworks,
        })
        .getAttribute("href"),
    ).toBe("/topology?classification=");
    expect(
      screen.getByRole("img", { name: messages.topologyPrototype.graphLabel }),
    ).toBeTruthy();
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
    setMockSearchParams(new URLSearchParams("classification=concept"));

    render(
      <TopologyPrototype
        messages={messages}
        docsPageContentByRegistryId={docsPageContentByRegistryId}
      />,
    );

    expect(
      screen.getAllByText(messages.topologyPrototype.emptyTitle).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Selected classification: concept.")).toBeTruthy();
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

  test("renders the inspection panel shell in the default state", async () => {
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
      screen.getByText(messages.topologyPrototype.detailPanelTitle),
    ).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.detailPanelHint),
    ).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.detailPanelEmptyTitle),
    ).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.detailPanelEmptyDescription),
    ).toBeTruthy();
  });
});
