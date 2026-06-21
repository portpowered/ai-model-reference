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
    expect(screen.queryByText(topologyPrototype.description)).toBeNull();
    expect(
      screen.getByRole("navigation", {
        name: topologyPrototype.chipListLabel,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: topologyPrototype.clearSelectionLabel,
      }),
    ).toBeTruthy();
    expect(screen.getByText(topologyPrototype.successTitle)).toBeTruthy();
    expect(
      screen.getByRole("img", { name: topologyPrototype.graphLabel }),
    ).toBeTruthy();
  });

  test("renders the quieter graph shell in the docs layout", async () => {
    const messages = await loadUiMessages();
    setMockPathname("/topology");
    setMockSearchParams(new URLSearchParams());

    render(await renderTopologyPrototypePage());

    const { topologyPrototype } = messages;
    expect(screen.queryByText(topologyPrototype.loadingTitle)).toBeNull();
    expect(screen.queryByText(topologyPrototype.emptyTitle)).toBeNull();
    expect(screen.queryByText(topologyPrototype.errorTitle)).toBeNull();
    expect(
      screen.queryByText(topologyPrototype.accessibleNodeListTitle),
    ).toBeNull();
    expect(
      screen.queryByText(topologyPrototype.accessibleRelationshipListTitle),
    ).toBeNull();
    expect(screen.queryByText(topologyPrototype.legendTitle)).toBeNull();
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
      screen.queryByText(messages.topologyPrototype.description),
    ).toBeNull();
    expect(
      screen.getByRole("navigation", {
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
  });

  test("renders localized vietnamese topology copy", async () => {
    const messages = await loadUiMessages("vi");
    setMockPathname("/vi/topology");
    setMockSearchParams(new URLSearchParams());

    render(await renderTopologyPrototypePage("vi"));

    expect(screen.getByText(messages.topologyPrototype.title)).toBeTruthy();
    expect(
      screen.queryByText(messages.topologyPrototype.description),
    ).toBeNull();
    expect(
      screen.getByRole("navigation", {
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
  });
});
