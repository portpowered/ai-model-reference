import Link from "next/link";
import type { TopologyBrowseState } from "@/lib/content/topology-browse";
import type {
  TopologyNavigationOption,
  TopologySurfaceMode,
} from "@/lib/content/topology-navigation";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import {
  bulletlessListClassName,
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

function formatModeLabel(
  messages: UiMessages,
  mode: TopologySurfaceMode,
): string {
  return mode === "graph-map"
    ? messages.topologyBrowse.graphMapLabel
    : messages.topologyBrowse.timelineLabel;
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
                  {option.label} {destination.label}
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
      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-labelledby="topology-selected-heading"
      >
        <h2
          id="topology-selected-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          {messages.topologyBrowse.membersTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {modeDescription}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
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
      </section>

      {members.length === 0 ? (
        <TopologyEmptyState messages={messages} />
      ) : (
        <MemberListTag
          className={bulletlessListClassName("mt-8")}
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
                <p className="mt-2 text-xs uppercase text-muted-foreground">
                  {member.kind} / {member.membershipType}
                </p>
              </Link>
            </li>
          ))}
        </MemberListTag>
      )}

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
