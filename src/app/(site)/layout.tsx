import type { ReactNode } from "react";
import { DocsShell } from "@/components/layout/docs-shell";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const messages = loadUiMessages();
  return <DocsShell messages={messages}>{children}</DocsShell>;
}
