import "@/tests/a11y/mock-navigation";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { renderTopologyPrototypePage } from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  resetMockNavigation,
  setMockPathname,
  setMockSearchParams,
} from "@/tests/a11y/mock-navigation";

describe("topology prototype page", () => {
  afterEach(() => {
    cleanup();
    resetMockNavigation();
  });

  test("renders the default activation/feed-forward graph state", async () => {
    const messages = await loadUiMessages();
    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams());

    render(await renderTopologyPrototypePage());

    const { topologyPrototype } = messages;
    expect(screen.getByText(topologyPrototype.title)).toBeTruthy();
    expect(screen.getByText(topologyPrototype.description)).toBeTruthy();
    expect(screen.getByText(topologyPrototype.selectedViewValue)).toBeTruthy();
    expect(screen.getByText(topologyPrototype.successTitle)).toBeTruthy();
    expect(screen.getByText(topologyPrototype.nodeActivation)).toBeTruthy();
    expect(screen.getByText(topologyPrototype.nodeRelu)).toBeTruthy();
    expect(screen.getByText(topologyPrototype.nodeSwiGLU)).toBeTruthy();
    expect(screen.getByText(topologyPrototype.nodeFeedForward)).toBeTruthy();
    expect(
      screen.getByRole("img", { name: topologyPrototype.graphLabel }),
    ).toBeTruthy();
  });

  test("renders loading, empty, error, and success regions in the docs shell", async () => {
    const messages = await loadUiMessages();
    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams());

    render(await renderTopologyPrototypePage());

    const { topologyPrototype } = messages;
    expect(screen.getByText(topologyPrototype.loadingTitle)).toBeTruthy();
    expect(
      screen.getAllByText(topologyPrototype.emptyTitle).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(topologyPrototype.errorTitle).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(topologyPrototype.successTitle)).toBeTruthy();
    expect(document.getElementById("nd-page")).toBeTruthy();
  });

  test("renders localized japanese topology copy", async () => {
    const messages = await loadUiMessages("ja");
    setMockPathname("/ja/topology");
    setMockSearchParams(new URLSearchParams());

    render(await renderTopologyPrototypePage("ja"));

    expect(screen.getByText(messages.topologyPrototype.title)).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.description),
    ).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.selectedViewValue),
    ).toBeTruthy();
    expect(
      screen.getByRole("list", {
        name: messages.topologyPrototype.chipListLabel,
      }),
    ).toBeTruthy();
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
    expect(
      screen.getAllByRole("link", {
        name: messages.topologyPrototype.detailOpenCanonicalPage,
      }).length,
    ).toBeGreaterThan(0);
  });

  test("renders localized vietnamese topology copy", async () => {
    const messages = await loadUiMessages("vi");
    setMockPathname("/vi/topology");
    setMockSearchParams(new URLSearchParams());

    render(await renderTopologyPrototypePage("vi"));

    expect(screen.getByText(messages.topologyPrototype.title)).toBeTruthy();
    expect(
      screen.getByText(messages.topologyPrototype.description),
    ).toBeTruthy();
    expect(
      screen.getByRole("list", {
        name: messages.topologyPrototype.chipListLabel,
      }),
    ).toBeTruthy();
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
    expect(
      screen.getAllByRole("link", {
        name: messages.topologyPrototype.detailOpenCanonicalPage,
      }).length,
    ).toBeGreaterThan(0);
  });
});
