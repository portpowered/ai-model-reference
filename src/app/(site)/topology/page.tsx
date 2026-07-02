import type { Metadata } from "next";
import {
  buildStaticSurfaceMetadata,
  renderTopologyPrototypePage,
} from "@/app/(site)/site-renderers";
import { loadUiMessages } from "@/lib/content/ui-messages";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadUiMessages();

  return buildStaticSurfaceMetadata(
    { surface: "topology" },
    {
      title: messages.topologyPrototype.title,
      description: messages.topologyPrototype.description,
    },
  );
}

export default async function TopologyPrototypePage() {
  return renderTopologyPrototypePage();
}
