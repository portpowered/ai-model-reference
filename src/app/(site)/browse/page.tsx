import type { Metadata } from "next";
import {
  buildStaticSurfaceMetadata,
  renderBrowseIndexPage,
} from "../site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";

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

export default async function BrowseIndexPage() {
  return renderBrowseIndexPage();
}
