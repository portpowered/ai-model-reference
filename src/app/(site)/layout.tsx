import type { ReactNode } from "react";
import { DocsShell } from "@/components/layout/docs-shell";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await loadUiMessages();
  return <DocsShell messages={messages}>{children}</DocsShell>;
}
