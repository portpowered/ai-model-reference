import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadComponentExampleContext } from "@/component-examples/load-context";
import { componentExamples } from "@/component-examples/registry";
import { GenerationEvolutionBlogVisual } from "@/features/generation-evolution/GenerationEvolutionBlogVisual";
import { GenerationEvolutionTimeline } from "@/features/generation-evolution/GenerationEvolutionTimeline";
import {
  DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
  GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
} from "@/features/generation-evolution/generation-evolution-data";
import { GENERATION_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE } from "@/features/generation-evolution/generation-evolution-surface";

/** Representative blog embed widths for mobile and desktop review fixtures. */
export const GENERATION_EVOLUTION_VISUAL_VIEWPORTS = [
  { label: "narrow", width: 390 },
  { label: "wide", width: 1280 },
] as const;

const REQUIRED_STAGE_LABELS = [
  "U-Net denoising",
  "Diffusion transformer denoising",
  "Flow-matching generation",
  "Open-world and video generation",
] as const;

const GENERATION_EVOLUTION_COMPONENT_EXAMPLE_IDS = [
  "generation-evolution-default",
  "generation-evolution-empty",
  "generation-evolution-error",
] as const;

function renderAtViewportWidth(widthPx: number, ui: ReactNode) {
  return render(
    <div
      data-generation-evolution-viewport-width={widthPx}
      style={{ width: widthPx, maxWidth: widthPx }}
    >
      {ui}
    </div>,
  );
}

describe("generation evolution visual fixtures", () => {
  afterEach(() => {
    cleanup();
  });

  test("prove all four required stage labels render in progression order", () => {
    render(<GenerationEvolutionTimeline />);

    for (const label of REQUIRED_STAGE_LABELS) {
      expect(
        screen.getByRole("heading", { level: 3, name: label }),
      ).toBeTruthy();
    }

    const stageNodes = [
      ...document.querySelectorAll("[data-generation-evolution-stage]"),
    ];
    expect(stageNodes).toHaveLength(REQUIRED_STAGE_LABELS.length);
    expect(
      stageNodes.map((node) =>
        node.getAttribute("data-generation-evolution-stage"),
      ),
    ).toEqual(
      DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages.map((stage) => stage.id),
    );
  });

  test("prove title and legend orientation elements render for reviewers", () => {
    render(<GenerationEvolutionTimeline />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.title,
      }),
    ).toBeTruthy();

    const legend = document.querySelector(
      '[data-generation-evolution-legend="true"]',
    );
    expect(legend).toBeTruthy();
    for (const value of Object.values(
      DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.legend,
    )) {
      expect(legend?.textContent).toContain(value);
    }
  });

  test.each(
    GENERATION_EVOLUTION_VISUAL_VIEWPORTS.map(
      (viewport) => [viewport.label, viewport.width] as const,
    ),
  )("keeps labels, title, and legend readable at %s blog width (%spx)", (_label, widthPx) => {
    renderAtViewportWidth(widthPx, <GenerationEvolutionBlogVisual />);

    expect(
      screen.getByRole("region", {
        name: GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.title,
      }),
    ).toBeTruthy();

    for (const label of REQUIRED_STAGE_LABELS) {
      expect(
        screen.getByRole("heading", { level: 3, name: label }),
      ).toBeTruthy();
    }

    const shell = document.querySelector(
      '[data-generation-evolution-state="success"]',
    );
    expect(shell?.className).toContain("min-w-0");
    expect(shell?.className).toContain("max-w-full");
    expect(shell?.className).toContain("overflow-x-hidden");
    expect(shell?.className).not.toContain("overflow-x-auto");
  });

  test("prove accessible color tokens and non-color change-kind labels", () => {
    const html = renderToStaticMarkup(<GenerationEvolutionTimeline />);

    expect(html).toContain("bg-primary/15 text-primary");
    expect(html).toContain("bg-secondary text-secondary-foreground");
    expect(html).toContain("bg-muted text-muted-foreground");
    expect(html).toContain(
      `data-manual-visibility-evidence="${GENERATION_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE}"`,
    );

    for (const stage of DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages) {
      expect(html).toContain(
        `data-generation-evolution-theme-token="${stage.changeKind}"`,
      );
      expect(html).toContain(
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.legend[stage.changeKind],
      );
    }
  });

  test("render controlled accessible empty state without throwing", () => {
    expect(() =>
      render(
        <GenerationEvolutionTimeline
          data={{
            ...DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
            stages: [],
          }}
        />,
      ),
    ).not.toThrow();

    expect(
      screen.getByRole("region", {
        name: `${GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`,
      }),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-generation-evolution-state="empty"]'),
    ).toBeTruthy();
  });

  test("render controlled accessible invalid-order state without throwing", () => {
    expect(() =>
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
      ),
    ).not.toThrow();

    expect(
      screen.getByRole("alert", {
        name: `${GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`,
      }),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-generation-evolution-state="error"]'),
    ).toBeTruthy();
  });

  test("expose component-examples visual fixtures for browser review", async () => {
    const exampleIds = componentExamples.map((example) => example.id);
    const context = await loadComponentExampleContext();

    for (const fixtureId of GENERATION_EVOLUTION_COMPONENT_EXAMPLE_IDS) {
      expect(exampleIds).toContain(fixtureId);
    }

    for (const fixtureId of GENERATION_EVOLUTION_COMPONENT_EXAMPLE_IDS) {
      const example = componentExamples.find((entry) => entry.id === fixtureId);
      expect(example?.componentName).toBe("GenerationEvolutionTimeline");
      expect(() =>
        renderToStaticMarkup(example?.render(context) ?? null),
      ).not.toThrow();
    }
  });
});
