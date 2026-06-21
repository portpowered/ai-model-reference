"use client";

import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  TopologyBrowsePage,
  type TopologyMemberEntry,
  topologyBrowseDescription,
  topologyBrowseTitle,
} from "@/features/docs/components/TopologyBrowsePage";
import {
  readTopologyBrowseStateFromLocationSearch,
  type TopologyBrowseState,
} from "@/lib/content/topology-browse";
import type { TopologyNavigationOption } from "@/lib/content/topology-navigation";
import type { UiMessages } from "@/lib/content/ui-messages.types";

type StaticExportBrowsePageProps = {
  messages: UiMessages;
  options: readonly TopologyNavigationOption[];
  membersByClassificationSlug: Record<string, TopologyMemberEntry[]>;
  defaultPage: ReactNode;
};

export function StaticExportBrowsePage({
  messages,
  options,
  membersByClassificationSlug,
  defaultPage,
}: StaticExportBrowsePageProps) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<TopologyBrowseState | null>(null);

  useEffect(() => {
    setState(
      readTopologyBrowseStateFromLocationSearch(
        options,
        `?${searchParams.toString()}`,
      ),
    );
  }, [options, searchParams]);

  if (state === null || state.kind === "not-requested") {
    return <>{defaultPage}</>;
  }

  const members =
    state.kind === "selected"
      ? (membersByClassificationSlug[state.option.classificationSlug] ?? [])
      : [];

  return (
    <DocsPage breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>{topologyBrowseTitle(messages, state)}</DocsTitle>
      <DocsDescription>
        {topologyBrowseDescription(messages, state)}
      </DocsDescription>
      <DocsBody>
        <TopologyBrowsePage
          messages={messages}
          state={state}
          members={members}
        />
      </DocsBody>
    </DocsPage>
  );
}
