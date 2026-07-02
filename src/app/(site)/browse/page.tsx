import type { Metadata } from "next";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  type BrowseIndexPageProps,
  buildStaticSurfaceMetadata,
  renderBrowseIndexPage,
} from "../site-renderers";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return buildStaticSurfaceMetadata(
    { surface: "browse" },
    {
      title: messages.browseIndex.title,
      description: messages.browseIndex.description,
    },
  );
}

export default async function BrowseIndexPage({
  searchParams,
}: BrowseIndexPageProps) {
  return renderBrowseIndexPage(undefined, { searchParams });
}
