import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { GenerationEvolutionBlogVisual } from "@/features/generation-evolution/GenerationEvolutionBlogVisual";
import { GenerationEvolutionTimeline } from "@/features/generation-evolution/GenerationEvolutionTimeline";
import {
  DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
  GENERATION_EVOLUTION_STAGE_ORDER,
  GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
} from "@/features/generation-evolution/generation-evolution-data";
import {
  GENERATION_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE,
  GENERATION_EVOLUTION_SURFACE,
} from "@/features/generation-evolution/generation-evolution-surface";

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
        name: `${GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`,
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
        name: `${GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`,
      }),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-generation-evolution-state="error"]'),
    ).toBeTruthy();
  });
});

describe("GenerationEvolutionTimeline accessibility and responsiveness", () => {
  afterEach(() => {
    cleanup();
  });

  test("exposes a generation-evolution accessible name and stage headings", () => {
    render(<GenerationEvolutionTimeline />);

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

    for (const stage of DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages) {
      expect(
        screen.getByRole("heading", { level: 3, name: stage.label }),
      ).toBeTruthy();
      expect(screen.getByText(stage.descriptor)).toBeTruthy();
    }
  });

  test("keeps responsive containment classes and avoids horizontal scroll shells", () => {
    const html = renderToStaticMarkup(<GenerationEvolutionTimeline />);

    expect(html).toContain("min-w-0");
    expect(html).toContain("max-w-full");
    expect(html).toContain("overflow-x-hidden");
    expect(html).toContain("break-words");
    expect(html).not.toContain("overflow-x-auto");
  });

  test("uses theme tokens and non-color change-kind labels for reviewer evidence", () => {
    const html = renderToStaticMarkup(<GenerationEvolutionTimeline />);

    expect(html).toContain("bg-primary/15 text-primary");
    expect(html).toContain("bg-secondary text-secondary-foreground");
    expect(html).toContain("bg-muted text-muted-foreground");
    expect(html).toContain(
      `data-manual-visibility-evidence="${GENERATION_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE}"`,
    );
    expect(html).toContain(
      'data-generation-evolution-theme-token="architecture"',
    );
    expect(html).toContain('data-generation-evolution-theme-token="objective"');
    expect(html).toContain('data-generation-evolution-theme-token="domain"');

    for (const stage of DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages) {
      const stageNode = document.createElement("div");
      stageNode.innerHTML = html;
      const badge = stageNode.querySelector(
        `[data-generation-evolution-stage="${stage.id}"] [data-generation-evolution-change-kind="${stage.changeKind}"]`,
      );
      expect(badge?.textContent).toBe(
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.legend[stage.changeKind],
      );
    }
  });
});

describe("GenerationEvolutionBlogVisual", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders the default blog comparison without client-side fetching", () => {
    render(<GenerationEvolutionBlogVisual />);

    const section = screen.getByRole("region", {
      name: GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
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
