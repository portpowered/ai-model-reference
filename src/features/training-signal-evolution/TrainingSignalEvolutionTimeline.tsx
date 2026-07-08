import {
  DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA,
  TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME,
  type TrainingSignalEvolutionPhaseKind,
  type TrainingSignalEvolutionVisualData,
  validateTrainingSignalEvolutionStages,
} from "@/features/training-signal-evolution/training-signal-evolution-data";
import {
  TRAINING_SIGNAL_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE,
  TRAINING_SIGNAL_EVOLUTION_SURFACE,
} from "@/features/training-signal-evolution/training-signal-evolution-surface";

const phaseKindLegendClassName: Record<
  TrainingSignalEvolutionPhaseKind,
  string
> = {
  pretraining: "bg-primary/15 text-primary",
  midTraining: "bg-secondary text-secondary-foreground",
  postTraining: "bg-accent text-accent-foreground",
  promptingAdaptation: "bg-muted text-muted-foreground",
  onPolicyLoop: "bg-card text-foreground border border-border",
};

const timelineTitleId = "training-signal-evolution-visual-title";

const timelineShellClassName =
  "w-full min-w-0 max-w-full overflow-x-hidden rounded-[var(--radius)] border border-border bg-card/40 px-4 py-4 md:px-6";

const timelineListClassName =
  "relative m-0 grid w-full min-w-0 max-w-full list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-3 md:gap-3";

const timelineItemClassName =
  "relative min-w-0 max-w-full break-words rounded-[var(--radius)] border border-border bg-card px-4 py-4";

const timelineStateClassName =
  "rounded-[var(--radius)] border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground";

type TrainingSignalEvolutionTimelineProps = {
  data?: TrainingSignalEvolutionVisualData;
};

export function TrainingSignalEvolutionTimeline({
  data = DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA,
}: TrainingSignalEvolutionTimelineProps) {
  const validation = validateTrainingSignalEvolutionStages(data.stages);

  if (!validation.ok) {
    if (validation.reason === "empty") {
      return (
        <section
          aria-label={`${TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`}
          className={timelineStateClassName}
          data-training-signal-evolution-surface={
            TRAINING_SIGNAL_EVOLUTION_SURFACE
          }
          data-training-signal-evolution-state="empty"
        >
          <p className="m-0 font-medium text-foreground">
            Training-signal evolution stages unavailable
          </p>
          <p className="m-0 mt-2">
            Add at least one stage in the pretraining-through-on-policy
            progression order.
          </p>
        </section>
      );
    }

    return (
      <section
        aria-label={`${TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME} unavailable`}
        className={timelineStateClassName}
        data-training-signal-evolution-surface={
          TRAINING_SIGNAL_EVOLUTION_SURFACE
        }
        data-training-signal-evolution-state="error"
        role="alert"
      >
        <p className="m-0 font-medium text-foreground">
          Training-signal evolution visual unavailable
        </p>
        <p className="m-0 mt-2">
          Stage data must follow the pretraining, prompting, instruction tuning,
          preference feedback, verifiable reward, and on-policy loop progression
          order.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME}
      className={timelineShellClassName}
      data-training-signal-evolution-surface={data.surface}
      data-training-signal-evolution-state="success"
      data-manual-visibility-evidence={
        TRAINING_SIGNAL_EVOLUTION_MANUAL_VISIBILITY_EVIDENCE
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
          data-training-signal-evolution-legend="true"
        >
          {(
            Object.entries(data.legend) as Array<
              [TrainingSignalEvolutionPhaseKind, string]
            >
          ).map(([phaseKind, label]) => (
            <div className="flex items-center gap-2" key={phaseKind}>
              <dt className="sr-only">{label}</dt>
              <dd
                className={`m-0 rounded-full px-2.5 py-1 font-medium ${phaseKindLegendClassName[phaseKind]}`}
              >
                {label}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <ol className={timelineListClassName}>
        {data.stages.map((stage) => (
          <li
            aria-label={`${stage.label}. ${stage.descriptor}`}
            className={timelineItemClassName}
            data-training-signal-evolution-stage={stage.id}
            key={stage.id}
          >
            <div className="flex flex-col gap-2">
              <p
                className={`m-0 inline-flex self-start rounded-full px-2 py-0.5 text-xs font-medium ${phaseKindLegendClassName[stage.phaseKind]}`}
                data-training-signal-evolution-phase-kind={stage.phaseKind}
                data-training-signal-evolution-theme-token={stage.phaseKind}
              >
                {data.legend[stage.phaseKind]}
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
