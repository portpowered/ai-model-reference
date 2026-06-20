import type { Metadata } from "next";
import {
  renderTimelinePage,
  type TimelinePageProps,
} from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return {
    title: messages.timelinePage.title,
    description: messages.timelinePage.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "timeline",
    }),
  };
}

export default async function TimelinePage(props: TimelinePageProps) {
  return renderTimelinePage(undefined, props);
}
