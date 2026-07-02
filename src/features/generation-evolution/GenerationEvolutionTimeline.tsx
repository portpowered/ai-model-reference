import {
  DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
  type GenerationEvolutionChangeKind,
  type GenerationEvolutionVisualData,
  validateGenerationEvolutionStages,
} from "@/features/generation-evolution/generation-evolution-data";
import { GENERATION_EVOLUTION_SURFACE } from "@/features/generation-evolution/generation-evolution-surface";

const changeKindLegendClassName: Record<GenerationEvolutionChangeKind, string> =
  {
    architecture: "bg-primary/15 text-primary",
    objective: "bg-secondary text-secondary-foreground",
    domain: "bg-muted text-muted-foreground",
  };

const timelineShellClassName =
  "rounded-[var(--radius)] border border-border bg-card/40 px-4 py-4 md:px-6";

const timelineListClassName =
  "relative m-0 grid list-none gap-4 p-0 md:grid-cols-4 md:gap-3";

const timelineItemClassName =
  "relative rounded-[var(--radius)] border border-border bg-card px-4 py-4";

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
    return (
      <section
        aria-label="Generation evolution visual unavailable"
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
      aria-label={data.title}
      className={timelineShellClassName}
      data-generation-evolution-surface={data.surface}
      data-generation-evolution-state="success"
    >
      <header className="mb-4 space-y-3">
        <h2 className="m-0 text-lg font-semibold text-foreground">
          {data.title}
        </h2>
        <dl
          className="m-0 flex flex-wrap gap-3 text-sm"
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
            className={timelineItemClassName}
            data-generation-evolution-stage={stage.id}
            key={stage.id}
          >
            {index < data.stages.length - 1 ? (
              <span aria-hidden="true" className={timelineConnectorClassName} />
            ) : null}
            <div className="flex flex-col gap-2">
              <p
                className={`m-0 w-fit rounded-full px-2 py-0.5 text-xs font-medium ${changeKindLegendClassName[stage.changeKind]}`}
              >
                {data.legend[stage.changeKind]}
              </p>
              <h3 className="m-0 text-base font-semibold text-foreground">
                {stage.label}
              </h3>
              <p className="m-0 text-sm leading-6 text-muted-foreground">
                {stage.descriptor}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
