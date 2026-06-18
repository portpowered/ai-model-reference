import type { Metadata } from "next";
import {
  buildStaticSurfaceMetadata,
  renderBrowseIndexPage,
} from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { resolveMetadataLocale } from "../localized-shell-metadata";

type LocalizedBrowseIndexPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedBrowseIndexPageProps): Promise<Metadata> {
  const locale = await resolveMetadataLocale(params);
  const messages = await loadUiMessages(locale);

  return buildStaticSurfaceMetadata(
    { surface: "browse" },
    {
      title: messages.browseIndex.title,
      description: messages.browseIndex.description,
    },
  );
}

export default async function LocalizedBrowseIndexPage({
  params,
}: LocalizedBrowseIndexPageProps) {
  const locale = await resolveMetadataLocale(params);
  return renderBrowseIndexPage(locale);
}
