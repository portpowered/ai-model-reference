import Link from "next/link";
import type { TopologyBrowseState } from "@/lib/content/topology-browse";
import type {
  TopologyNavigationOption,
  TopologySurfaceMode,
} from "@/lib/content/topology-navigation";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  bulletlessListClassName,
  bulletlessListMarkersClassName,
  docsResourceCardLinkClassName,
} from "./list-decoration";

export type TopologyMemberEntry = {
  registryId: string;
  slug: string;
  title: string;
  summary: string;
  url: string;
  kind: string;
  membershipType: "primary" | "secondary";
};

type ResolvedTopologyBrowseState = Exclude<
  TopologyBrowseState,
  { kind: "not-requested" }
>;

type TopologyBrowsePageProps = {
  messages: UiMessages;
  state: ResolvedTopologyBrowseState;
  members?: TopologyMemberEntry[];
};

function formatTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (formatted, [key, value]) => formatted.replaceAll(`{${key}}`, value),
    template,
  );
}

function formatNavigationLabel(
  messages: UiMessages,
  classificationLabel: string,
  modeLabel: string,
): string {
  return formatTemplate(messages.topologyBrowse.navigationLabelTemplate, {
    classification: classificationLabel,
    mode: modeLabel,
  });
}

function formatModeLabel(
  messages: UiMessages,
  mode: TopologySurfaceMode,
): string {
  return mode === "graph-map"
    ? messages.topologyBrowse.graphMapLabel
    : messages.topologyBrowse.timelineLabel;
}

function destinationHrefForMode(
  option: TopologyNavigationOption,
  mode: TopologySurfaceMode,
): string {
  return (
    option.destinations.find((destination) => destination.mode === mode)
      ?.href ??
    option.destinations[0]?.href ??
    "#"
  );
}

function TopologyClassificationSelector({
  messages,
  options,
  selectedClassificationSlug,
  mode,
}: {
  messages: UiMessages;
  options: readonly TopologyNavigationOption[];
  selectedClassificationSlug: string;
  mode: TopologySurfaceMode;
}) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-4"
      aria-labelledby="topology-classification-selector-heading"
    >
      <h2
        id="topology-classification-selector-heading"
        className="font-serif text-2xl font-semibold text-foreground"
      >
        {messages.topologyBrowse.classificationSelectorTitle}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {messages.topologyBrowse.classificationSelectorDescription}
      </p>
      <nav
        className="mt-4"
        aria-label={messages.topologyBrowse.classificationSelectorLabel}
      >
        <ul
          className={`${bulletlessListMarkersClassName} flex flex-wrap gap-3`}
        >
          {options.map((option) => {
            const isSelected =
              option.classificationSlug === selectedClassificationSlug;

            return (
              <li key={option.classificationSlug}>
                <Link
                  href={destinationHrefForMode(option, mode)}
                  aria-current={isSelected ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}

function TopologyOptionLinks({
  messages,
  options,
}: {
  messages: UiMessages;
  options: readonly TopologyNavigationOption[];
}) {
  return (
    <section className="mt-8" aria-labelledby="topology-valid-options-heading">
      <h2
        id="topology-valid-options-heading"
        className="font-serif text-2xl font-semibold text-foreground"
      >
        {messages.topologyBrowse.validOptionsTitle}
      </h2>
      <ul
        className={bulletlessListClassName("mt-4")}
        aria-label={messages.topologyBrowse.validOptionsTitle}
      >
        {options.flatMap((option) =>
          option.destinations.map((destination) => (
            <li key={`${option.classificationSlug}-${destination.mode}`}>
              <Link
                href={destination.href}
                className={docsResourceCardLinkClassName}
              >
                <span className="font-medium text-foreground">
                  {formatNavigationLabel(
                    messages,
                    option.label,
                    destination.label,
                  )}
                </span>
                <p className="mt-1 text-sm text-muted-foreground">
                  {option.memberCount}{" "}
                  {messages.topologyBrowse.memberListLabel.toLowerCase()}
                </p>
              </Link>
            </li>
          )),
        )}
      </ul>
    </section>
  );
}

function TopologyInvalidState({
  messages,
  state,
}: {
  messages: UiMessages;
  state: Extract<TopologyBrowseState, { kind: "invalid" }>;
}) {
  return (
    <>
      <section
        className="rounded-lg border border-destructive/40 bg-destructive/10 p-4"
        aria-label={messages.topologyBrowse.invalidTitle}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">
              {messages.topologyBrowse.invalidClassificationLabel}
            </dt>
            <dd className="mt-1 text-muted-foreground">
              {state.requestedClassification ??
                messages.topologyBrowse.missingValue}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">
              {messages.topologyBrowse.invalidModeLabel}
            </dt>
            <dd className="mt-1 text-muted-foreground">
              {state.requestedMode ?? messages.topologyBrowse.missingValue}
            </dd>
          </div>
        </dl>
      </section>
      <TopologyOptionLinks messages={messages} options={state.options} />
    </>
  );
}

function TopologyEmptyState({ messages }: { messages: UiMessages }) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-4"
      aria-labelledby="topology-empty-heading"
    >
      <h2
        id="topology-empty-heading"
        className="font-serif text-2xl font-semibold text-foreground"
      >
        {messages.topologyBrowse.emptyTitle}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {messages.topologyBrowse.emptyDescription}
      </p>
    </section>
  );
}

function TopologySelectedState({
  messages,
  state,
  members,
}: {
  messages: UiMessages;
  state: Extract<TopologyBrowseState, { kind: "selected" }>;
  members: TopologyMemberEntry[];
}) {
  const modeLabel = formatModeLabel(messages, state.mode);
  const modeDescription =
    state.mode === "graph-map"
      ? messages.topologyBrowse.graphMapDescription
      : messages.topologyBrowse.timelineDescription;
  const MemberListTag = state.mode === "timeline" ? "ol" : "ul";

  return (
    <>
      <TopologyClassificationSelector
        messages={messages}
        options={state.options}
        selectedClassificationSlug={state.option.classificationSlug}
        mode={state.mode}
      />
      <section
        className="mt-8 rounded-lg border border-border bg-card p-4"
        aria-labelledby="topology-selected-state-heading"
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">
              {messages.topologyBrowse.selectedClassificationLabel}
            </dt>
            <dd className="mt-1 text-muted-foreground">{state.option.label}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">
              {messages.topologyBrowse.selectedModeLabel}
            </dt>
            <dd className="mt-1 text-muted-foreground">{modeLabel}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {modeDescription}
        </p>
      </section>

      <section className="mt-8" aria-labelledby="topology-members-heading">
        <h2
          id="topology-members-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {messages.topologyBrowse.membersTitle}
        </h2>
        <MemberListTag
          className={bulletlessListClassName("mt-4")}
          aria-label={messages.topologyBrowse.memberListLabel}
        >
          {members.map((member) => (
            <li key={member.registryId}>
              <Link href={member.url} className={docsResourceCardLinkClassName}>
                <span className="font-medium text-foreground">
                  {member.title}
                </span>
                <p className="mt-1 text-sm text-muted-foreground">
                  {member.summary}
                </p>
              </Link>
            </li>
          ))}
        </MemberListTag>
      </section>

      <TopologyOptionLinks messages={messages} options={state.options} />
    </>
  );
}

export function topologyBrowseTitle(
  messages: UiMessages,
  state: ResolvedTopologyBrowseState,
): string {
  if (state.kind === "selected") {
    return formatTemplate(messages.topologyBrowse.titleTemplate, {
      classification: state.option.label,
      mode: formatModeLabel(messages, state.mode),
    });
  }

  if (state.kind === "invalid") {
    return messages.topologyBrowse.invalidTitle;
  }

  return messages.topologyBrowse.emptyTitle;
}

export function topologyBrowseDescription(
  messages: UiMessages,
  state: ResolvedTopologyBrowseState,
): string {
  if (state.kind !== "selected") {
    return state.kind === "invalid"
      ? messages.topologyBrowse.invalidDescription
      : messages.topologyBrowse.emptyDescription;
  }

  return formatTemplate(messages.topologyBrowse.descriptionTemplate, {
    classification: state.option.label,
    mode: formatModeLabel(messages, state.mode),
  });
}

export function TopologyBrowsePage({
  messages,
  state,
  members = [],
}: TopologyBrowsePageProps) {
  if (state.kind === "empty") {
    return <TopologyEmptyState messages={messages} />;
  }

  if (state.kind === "invalid") {
    return <TopologyInvalidState messages={messages} state={state} />;
  }

  return (
    <TopologySelectedState
      messages={messages}
      state={state}
      members={members}
    />
  );
}
