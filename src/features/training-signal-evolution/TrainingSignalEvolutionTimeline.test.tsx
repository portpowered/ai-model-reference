import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { TrainingSignalEvolutionBlogVisual } from "@/features/training-signal-evolution/TrainingSignalEvolutionBlogVisual";
import { TrainingSignalEvolutionTimeline } from "@/features/training-signal-evolution/TrainingSignalEvolutionTimeline";
import {
  DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA,
  TRAINING_SIGNAL_EVOLUTION_STAGE_ORDER,
  TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
} from "@/features/training-signal-evolution/training-signal-evolution-data";
import {
  TRAINING_SIGNAL_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE,
  TRAINING_SIGNAL_EVOLUTION_SURFACE,
} from "@/features/training-signal-evolution/training-signal-evolution-surface";

describe("TrainingSignalEvolutionTimeline", () => {
  afterEach(() => {
    cleanup();
  });

  test("uses the focused training-signal evolution timeline surface", () => {
    const html = renderToStaticMarkup(<TrainingSignalEvolutionTimeline />);

    expect(html).toContain(
      `data-training-signal-evolution-surface="${TRAINING_SIGNAL_EVOLUTION_SURFACE}"`,
    );
    expect(html).toContain('data-training-signal-evolution-state="success"');
    expect(html).toContain(DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.title);
    expect(html).toContain('data-training-signal-evolution-legend="true"');
  });

  test("renders all six stage labels and descriptors in progression order", () => {
    render(<TrainingSignalEvolutionTimeline />);

    const stageNodes = [
      ...document.querySelectorAll("[data-training-signal-evolution-stage]"),
    ];
    expect(
      stageNodes.map((node) =>
        node.getAttribute("data-training-signal-evolution-stage"),
      ),
    ).toEqual([...TRAINING_SIGNAL_EVOLUTION_STAGE_ORDER]);

    for (const stage of DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.stages) {
      expect(screen.getByText(stage.label)).toBeTruthy();
      expect(screen.getByText(stage.descriptor)).toBeTruthy();
      expect(
        document.querySelector(
          `[data-training-signal-evolution-stage="${stage.id}"]`,
        ),
      ).toBeTruthy();
    }

    expect(stageNodes).toHaveLength(
      TRAINING_SIGNAL_EVOLUTION_STAGE_ORDER.length,
    );
  });

  test("expands RLHF and RLVR acronyms in stage labels before shorthand use", () => {
    render(<TrainingSignalEvolutionTimeline />);

    expect(
      screen.getByText("Reinforcement learning from human feedback (RLHF)"),
    ).toBeTruthy();
    expect(
      screen.getByText("Reinforcement learning with verifiable rewards (RLVR)"),
    ).toBeTruthy();
  });

  test("distinguishes training phases with visible legend text", () => {
    render(<TrainingSignalEvolutionTimeline />);

    const legend = DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.legend;
    const legendRoot = document.querySelector(
      '[data-training-signal-evolution-legend="true"]',
    );
    expect(legendRoot).toBeTruthy();
    expect(legendRoot?.textContent).toContain(legend.pretraining);
    expect(legendRoot?.textContent).toContain(legend.midTraining);
    expect(legendRoot?.textContent).toContain(legend.postTraining);
    expect(legendRoot?.textContent).toContain(legend.promptingAdaptation);
    expect(legendRoot?.textContent).toContain(legend.onPolicyLoop);

    for (const stage of DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.stages) {
      const stageNode = document.querySelector(
        `[data-training-signal-evolution-stage="${stage.id}"]`,
      );
      expect(stageNode).toBeTruthy();
      const badge = stageNode?.querySelector(
        `[data-training-signal-evolution-phase-kind="${stage.phaseKind}"]`,
      );
      expect(badge?.textContent).toBe(legend[stage.phaseKind]);
    }
  });

  test("renders an empty state when no stages are provided", () => {
    render(
      <TrainingSignalEvolutionTimeline
        data={{
          ...DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA,
          stages: [],
        }}
      />,
    );

    expect(
      screen.getByRole("region", {
        name: `${TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`,
      }),
    ).toBeTruthy();
    expect(
      screen.getByText("Training-signal evolution stages unavailable"),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-training-signal-evolution-state="empty"]'),
    ).toBeTruthy();
    expect(
      document.querySelectorAll("[data-training-signal-evolution-stage]")
        .length,
    ).toBe(0);
  });

  test("renders an error state for invalid stage order", () => {
    render(
      <TrainingSignalEvolutionTimeline
        data={{
          ...DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA,
          stages: [
            DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.stages[1],
            DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.stages[0],
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("alert", {
        name: `${TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`,
      }),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-training-signal-evolution-state="error"]'),
    ).toBeTruthy();
  });
});

describe("TrainingSignalEvolutionTimeline accessibility and responsiveness", () => {
  afterEach(() => {
    cleanup();
  });

  test("exposes an accessible name and stage headings", () => {
    render(<TrainingSignalEvolutionTimeline />);

    expect(
      screen.getByRole("region", {
        name: TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.title,
      }),
    ).toBeTruthy();

    for (const stage of DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.stages) {
      expect(
        screen.getByRole("heading", { level: 3, name: stage.label }),
      ).toBeTruthy();
      expect(screen.getByText(stage.descriptor)).toBeTruthy();
    }
  });

  test("keeps responsive containment classes and avoids horizontal scroll shells", () => {
    const html = renderToStaticMarkup(<TrainingSignalEvolutionTimeline />);

    expect(html).toContain("min-w-0");
    expect(html).toContain("max-w-full");
    expect(html).toContain("overflow-x-hidden");
    expect(html).toContain("break-words");
    expect(html).not.toContain("overflow-x-auto");
  });

  test("uses theme tokens and non-color phase labels for reviewer evidence", () => {
    const html = renderToStaticMarkup(<TrainingSignalEvolutionTimeline />);

    expect(html).toContain("bg-primary/15 text-primary");
    expect(html).toContain("bg-secondary text-secondary-foreground");
    expect(html).toContain("bg-accent text-accent-foreground");
    expect(html).toContain("bg-muted text-muted-foreground");
    expect(html).toContain(
      `data-manual-visibility-evidence="${TRAINING_SIGNAL_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE}"`,
    );
    expect(html).toContain(
      'data-training-signal-evolution-theme-token="pretraining"',
    );
    expect(html).toContain(
      'data-training-signal-evolution-theme-token="onPolicyLoop"',
    );
  });
});

describe("TrainingSignalEvolutionBlogVisual", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders the default blog timeline without client-side fetching", () => {
    render(<TrainingSignalEvolutionBlogVisual />);

    const section = screen.getByRole("region", {
      name: TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
    });
    expect(section).toBeTruthy();
    expect(
      within(section).getByText(
        DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.stages[0].label,
      ),
    ).toBeTruthy();
    expect(
      within(section).getByText(
        DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA.stages[5].label,
      ),
    ).toBeTruthy();
  });
});
