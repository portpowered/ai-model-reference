import type { Metadata } from "next";
import {
  renderTimelinePage,
  type TimelinePageProps,
} from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { localizedRouteAlternates } from "@/lib/i18n/route-locale";
import { resolveMetadataLocale } from "../../localized-shell-metadata";

type LocalizedTimelinePageProps = TimelinePageProps & {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedTimelinePageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return {
    title: messages.timelinePage.title,
    description: messages.timelinePage.description,
    alternates: localizedRouteAlternates({
      surface: "docs-page",
      slug: "timeline",
    }),
  };
}

export default async function LocalizedTimelinePage({
  params,
  searchParams,
}: LocalizedTimelinePageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderTimelinePage(locale, { searchParams });
}
