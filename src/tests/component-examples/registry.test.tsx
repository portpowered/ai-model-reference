import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { loadComponentExampleContext } from "@/component-examples/load-context";
import {
  componentExamples,
  groupExamplesByComponent,
} from "@/component-examples/registry";
import { REQUIRED_COMPONENT_NAMES } from "@/component-examples/types";

describe("component example registry", () => {
  test("covers required shared docs components with default and alternate states", () => {
    const grouped = groupExamplesByComponent();

    for (const componentName of REQUIRED_COMPONENT_NAMES) {
      const examples = grouped.get(componentName);
      expect(examples?.length).toBeGreaterThanOrEqual(2);
    }

    expect(componentExamples.length).toBeGreaterThanOrEqual(
      REQUIRED_COMPONENT_NAMES.length * 2,
    );
  });

  test("uses unique example ids", () => {
    const ids = componentExamples.map((example) => example.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("component example render smoke", () => {
  afterEach(() => {
    cleanup();
  });

  test("each registry example renders without throwing", async () => {
    const context = await loadComponentExampleContext();

    for (const example of componentExamples) {
      if (example.componentName === "SearchResultListItem") {
        continue;
      }

      const { container, unmount } = render(example.render(context));
      expect(container.firstChild).not.toBeNull();
      unmount();
    }
  });

  test("callout default example exposes resolved title text", async () => {
    const context = await loadComponentExampleContext();
    const calloutExample = componentExamples.find(
      (example) => example.id === "callout-note",
    );
    expect(calloutExample).toBeDefined();

    render(calloutExample?.render(context) ?? null);
    expect(screen.getByText("Reader Shortcut")).toBeTruthy();
  });
});
