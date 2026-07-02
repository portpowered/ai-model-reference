import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
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

  test("renders all four stage labels from the default blog data", () => {
    render(<GenerationEvolutionTimeline />);

    for (const stage of DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages) {
      expect(screen.getByText(stage.label)).toBeTruthy();
      expect(
        document.querySelector(
          `[data-generation-evolution-stage="${stage.id}"]`,
        ),
      ).toBeTruthy();
    }

    expect(
      document.querySelectorAll("[data-generation-evolution-stage]").length,
    ).toBe(GENERATION_EVOLUTION_STAGE_ORDER.length);
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
