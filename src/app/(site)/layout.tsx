import type { ReactNode } from "react";

import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { loadUiMessages } from "@/lib/content/ui-messages";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await loadUiMessages();
  return (
    <CanonicalDocsLayout messages={messages}>{children}</CanonicalDocsLayout>
  );
}
