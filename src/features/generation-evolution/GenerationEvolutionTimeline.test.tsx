import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerationEvolutionBlogVisual } from "@/features/generation-evolution/GenerationEvolutionBlogVisual";
import { GenerationEvolutionTimeline } from "@/features/generation-evolution/GenerationEvolutionTimeline";
import {
  DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
  GENERATION_EVOLUTION_STAGE_ORDER,
} from "@/features/generation-evolution/generation-evolution-data";
import { GENERATION_EVOLUTION_SURFACE } from "@/features/generation-evolution/generation-evolution-surface";

describe("GenerationEvolutionTimeline", () => {
  afterEach(() => {
    cleanup();
  });

  test("uses the focused generation-evolution timeline surface", () => {
    const html = renderToStaticMarkup(<GenerationEvolutionTimeline />);

    expect(html).toContain(
      `data-generation-evolution-surface="${GENERATION_EVOLUTION_SURFACE}"`,
    );
    expect(html).toContain('data-generation-evolution-state="success"');
    expect(html).toContain(DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.title);
    expect(html).toContain('data-generation-evolution-legend="true"');
  });

  test("renders all four stage labels and descriptors in progression order", () => {
    render(<GenerationEvolutionTimeline />);

    const stageNodes = [
      ...document.querySelectorAll("[data-generation-evolution-stage]"),
    ];
    expect(
      stageNodes.map((node) =>
        node.getAttribute("data-generation-evolution-stage"),
      ),
    ).toEqual([...GENERATION_EVOLUTION_STAGE_ORDER]);

    for (const stage of DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages) {
      expect(screen.getByText(stage.label)).toBeTruthy();
      expect(screen.getByText(stage.descriptor)).toBeTruthy();
      expect(
        document.querySelector(
          `[data-generation-evolution-stage="${stage.id}"]`,
        ),
      ).toBeTruthy();
    }

    expect(stageNodes).toHaveLength(GENERATION_EVOLUTION_STAGE_ORDER.length);
  });

  test("distinguishes architecture, objective, and domain changes with visible legend text", () => {
    render(<GenerationEvolutionTimeline />);

    const legend = DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.legend;
    const legendRoot = document.querySelector(
      '[data-generation-evolution-legend="true"]',
    );
    expect(legendRoot).toBeTruthy();
    expect(legendRoot?.textContent).toContain(legend.architecture);
    expect(legendRoot?.textContent).toContain(legend.objective);
    expect(legendRoot?.textContent).toContain(legend.domain);

    for (const stage of DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages) {
      const stageNode = document.querySelector(
        `[data-generation-evolution-stage="${stage.id}"]`,
      );
      expect(stageNode).toBeTruthy();
      const badge = stageNode?.querySelector(
        `[data-generation-evolution-change-kind="${stage.changeKind}"]`,
      );
      expect(badge?.textContent).toBe(legend[stage.changeKind]);
    }
  });

  test("renders an empty state when no stages are provided", () => {
    render(
      <GenerationEvolutionTimeline
        data={{
          ...DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
          stages: [],
        }}
      />,
    );

    expect(
      screen.getByRole("region", {
        name: "Generation evolution visual unavailable",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText("Generation evolution stages unavailable"),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-generation-evolution-state="empty"]'),
    ).toBeTruthy();
    expect(
      document.querySelectorAll("[data-generation-evolution-stage]").length,
    ).toBe(0);
  });

  test("renders an error state for invalid stage order", () => {
    render(
      <GenerationEvolutionTimeline
        data={{
          ...DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
          stages: [
            DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages[1],
            DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages[0],
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("alert", {
        name: "Generation evolution visual unavailable",
      }),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-generation-evolution-state="error"]'),
    ).toBeTruthy();
  });
});

describe("GenerationEvolutionBlogVisual", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders the default blog comparison without client-side fetching", () => {
    render(<GenerationEvolutionBlogVisual />);

    const section = screen.getByRole("region", {
      name: DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.title,
    });
    expect(section).toBeTruthy();
    expect(
      within(section).getByText(
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages[0].label,
      ),
    ).toBeTruthy();
    expect(
      within(section).getByText(
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages[3].label,
      ),
    ).toBeTruthy();
  });
});
