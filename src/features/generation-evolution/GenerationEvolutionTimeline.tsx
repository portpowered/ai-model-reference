import {
  DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
  GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
  type GenerationEvolutionChangeKind,
  type GenerationEvolutionVisualData,
  validateGenerationEvolutionStages,
} from "@/features/generation-evolution/generation-evolution-data";
import {
  GENERATION_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE,
  GENERATION_EVOLUTION_SURFACE,
} from "@/features/generation-evolution/generation-evolution-surface";

const changeKindLegendClassName: Record<GenerationEvolutionChangeKind, string> =
  {
    architecture: "bg-primary/15 text-primary",
    objective: "bg-secondary text-secondary-foreground",
    domain: "bg-muted text-muted-foreground",
  };

const timelineTitleId = "generation-evolution-visual-title";

const timelineShellClassName =
  "w-full min-w-0 max-w-full overflow-x-hidden rounded-[var(--radius)] border border-border bg-card/40 px-4 py-4 md:px-6";

const timelineListClassName =
  "relative m-0 grid w-full min-w-0 max-w-full list-none gap-4 p-0 md:grid-cols-4 md:gap-3";

const timelineItemClassName =
  "relative min-w-0 max-w-full break-words rounded-[var(--radius)] border border-border bg-card px-4 py-4";

const timelineConnectorClassName =
  "pointer-events-none absolute top-1/2 right-[-0.65rem] hidden h-px w-[1.3rem] -translate-y-1/2 bg-border md:block last:hidden";

const timelineStateClassName =
  "rounded-[var(--radius)] border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground";

type GenerationEvolutionTimelineProps = {
  data?: GenerationEvolutionVisualData;
};

export function GenerationEvolutionTimeline({
  data = DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
}: GenerationEvolutionTimelineProps) {
  const validation = validateGenerationEvolutionStages(data.stages);

  if (!validation.ok) {
    if (validation.reason === "empty") {
      return (
        <section
          aria-label={`${GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`}
          className={timelineStateClassName}
          data-generation-evolution-surface={GENERATION_EVOLUTION_SURFACE}
          data-generation-evolution-state="empty"
        >
          <p className="m-0 font-medium text-foreground">
            Generation evolution stages unavailable
          </p>
          <p className="m-0 mt-2">
            Add at least one stage in the U-Net, diffusion transformer,
            flow-matching, and open-world/video progression order.
          </p>
        </section>
      );
    }

    return (
      <section
        aria-label={`${GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`}
        className={timelineStateClassName}
        data-generation-evolution-surface={GENERATION_EVOLUTION_SURFACE}
        data-generation-evolution-state="error"
        role="alert"
      >
        <p className="m-0 font-medium text-foreground">
          Generation evolution visual unavailable
        </p>
        <p className="m-0 mt-2">
          Stage data must follow the U-Net, diffusion transformer,
          flow-matching, and open-world/video progression order.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={GENERATION_EVOLUTION_VISUAL_ACCESSIBLE_NAME}
      className={timelineShellClassName}
      data-generation-evolution-surface={data.surface}
      data-generation-evolution-state="success"
      data-manual-visibility-evidence={
        GENERATION_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE
      }
    >
      <header className="mb-4 min-w-0 max-w-full space-y-3">
        <h2
          className="m-0 text-balance text-lg font-semibold text-foreground"
          id={timelineTitleId}
        >
          {data.title}
        </h2>
        <dl
          className="m-0 flex min-w-0 max-w-full flex-wrap gap-3 text-sm"
          data-generation-evolution-legend="true"
        >
          <div className="flex items-center gap-2">
            <dt className="sr-only">{data.legend.architecture}</dt>
            <dd
              className={`m-0 rounded-full px-2.5 py-1 font-medium ${changeKindLegendClassName.architecture}`}
            >
              {data.legend.architecture}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">{data.legend.objective}</dt>
            <dd
              className={`m-0 rounded-full px-2.5 py-1 font-medium ${changeKindLegendClassName.objective}`}
            >
              {data.legend.objective}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">{data.legend.domain}</dt>
            <dd
              className={`m-0 rounded-full px-2.5 py-1 font-medium ${changeKindLegendClassName.domain}`}
            >
              {data.legend.domain}
            </dd>
          </div>
        </dl>
      </header>

      <ol className={timelineListClassName}>
        {data.stages.map((stage, index) => (
          <li
            aria-label={`${stage.label}. ${stage.descriptor}`}
            className={timelineItemClassName}
            data-generation-evolution-stage={stage.id}
            key={stage.id}
          >
            {index < data.stages.length - 1 ? (
              <span aria-hidden="true" className={timelineConnectorClassName} />
            ) : null}
            <div className="flex flex-col gap-2">
              <p
                className={`m-0 inline-flex self-start rounded-full px-2 py-0.5 text-xs font-medium ${changeKindLegendClassName[stage.changeKind]}`}
                data-generation-evolution-change-kind={stage.changeKind}
                data-generation-evolution-theme-token={stage.changeKind}
              >
                {data.legend[stage.changeKind]}
              </p>
              <h3 className="m-0 text-balance text-base font-semibold text-foreground">
                {stage.label}
              </h3>
              <p className="m-0 text-pretty text-sm leading-6 text-muted-foreground">
                {stage.descriptor}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
